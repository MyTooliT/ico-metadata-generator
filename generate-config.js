import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

function normalizeKey(key) {
    if (typeof key !== 'string') return null;
    return key.trim().toLowerCase().replace(/\s+/g, '_');
}

function loadWorkbook(filePath) {
    return xlsx.readFile(filePath);
}

function parseFields(sheet) {
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    const parameters = {};

    for (const row of rows) {
        const param = {};
        // normalize all columns
        for (const [key, value] of Object.entries(row)) {
            const nk = normalizeKey(key);
            if (!nk) continue;
            // skip unit if empty
            if (nk === 'unit' && String(value).trim() === '') continue;
            param[nk] = value;
        }

        const id = normalizeKey(param['id'] || param['field_id']);
        if (!id) continue;
        parameters[id] = param;
    }

    return parameters;
}

function parseLists(sheet) {
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (data.length === 0) return {};
    const headers = data[0].map(h => normalizeKey(h));
    const lists = {};
    headers.forEach(id => { if (id) lists[id] = []; });
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        headers.forEach((id, j) => {
            const val = row[j];
            if (id && val !== undefined && val !== '') lists[id].push(val);
        });
    }
    return lists;
}

function parseInfo(sheet) {
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const info = {};
    data.forEach(row => {
        const key = row[0];
        const value = row[1];
        if (key && value !== undefined && value !== '') {
            info[normalizeKey(key)] = value;
        }
    });
    return info;
}

function parseDefaultSheet(sheet) {
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const defaults = {}
    data.forEach(row => {
        const key = row[0];
        const value = row[1];
        if (key && value !== undefined && value !== '') {
            defaults[normalizeKey(key)] = value;
        }
    })
    return defaults;
}

function parseCategories(sheet) {
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    const categories = {};
    rows.forEach(row => {
        const id = normalizeKey(row['id']);
        if (!id) return;
        categories[id] = row['display_name'] || id;
    });
    return categories;
}

function parsePhase(sheet, parameters, categories) {
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '', range: 3 });
    const phaseData = {};
    rows.forEach(row => {
        const norm = {};
        for (const [key, value] of Object.entries(row)) {
            const nk = normalizeKey(key);
            if (nk) norm[nk] = value;
        }
        const fieldId = normalizeKey(norm['field_id'] || norm['id']);
        if (!fieldId || !parameters[fieldId]) return;
        let categoryKey = normalizeKey(norm['category'] || 'general');
        if (categories[categoryKey]) {
            categoryKey = categories[categoryKey];
        }
        phaseData[categoryKey] = phaseData[categoryKey] || {};
        const details = { ...parameters[fieldId] };
        if (norm['required'] !== undefined && norm['required'] !== '') {
            details.required = normalizeKey(norm['required']);
        }
        if (norm['default'] !== undefined && norm['default'] !== '') {
            details.default = norm['default'];
        }
        if (norm['description'] !== undefined && norm['description'] !== '') {
            details.description = norm['description'];
        }
        phaseData[categoryKey][fieldId] = details;
    });
    return phaseData;
}

function parseProfiles(wb, parameters, categories) {
    const profiles = {};
    const preSheets = wb.SheetNames.filter(n => n.toLowerCase().startsWith('pre_'));
    const bases = [...new Set(preSheets.map(n => normalizeKey(n).replace(/^pre_/, '')))];
    bases.forEach(base => {
        const profile = {};
        const preSheet = wb.Sheets[`pre_${base}`] || wb.Sheets[`PRE_${base}`];
        if (preSheet) {
            const idCell   = preSheet['B1'];
            const nameCell = preSheet['B2'];
            profile.id   = idCell   && idCell.v   ? normalizeKey(idCell.v)   : base;
            profile.name = nameCell && nameCell.v ? nameCell.v : base;
            profile.pre  = parsePhase(preSheet, parameters, categories);
        }
        const postSheet = wb.Sheets[`post_${base}`] || wb.Sheets[`POST_${base}`];
        if (postSheet) profile.post = parsePhase(postSheet, parameters, categories);
        profiles[base] = profile;
    });
    return profiles;
}


function generateConfig(excelPath) {
    const wb = loadWorkbook(excelPath);
    const config = { info: {}, profiles: {}, default_profile_id: '' };
    let parameters = {}
    let lists = {}
    let categories = {}
    if (wb.Sheets['fields']) { parameters = parseFields(wb.Sheets['fields']) }
    if (wb.Sheets['lists']) { lists = parseLists(wb.Sheets['lists']) }
    if (wb.Sheets['categories']) { categories = parseCategories(wb.Sheets['categories']) }
    if (wb.Sheets['info']) { config.info = parseInfo(wb.Sheets['info']) }
    if (wb.Sheets['default']) { Object.assign(config, parseDefaultSheet(wb.Sheets['default'])); }

    Object.entries(parameters).forEach(([paramId, param]) => {
        if (param.datatype && ['dropdown', 'text_suggestions'].includes(param.datatype)) {
            param.options = lists[paramId] || [];
        }
    });
    if (!config.info.config_date) {
        config.info.config_date = new Date().toISOString();
    }

    config.profiles = parseProfiles(wb, parameters, categories);

    return config;
}

function main() {
    const input      = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve('metadata.xlsx');
    console.log(`ℹ️ Input file received: ${input}`)
    const yamlOutput = process.argv[3] ? path.resolve(process.argv[3]) : path.resolve('metadata.yaml');
    console.log(`ℹ️ Output file set: ${yamlOutput}`)
    const cfg        = generateConfig(input);
    console.log('✅  Generation Successful!')
    fs.writeFileSync(yamlOutput, yaml.dump(cfg, { noRefs: true, lineWidth: 120 }), 'utf8');
    console.log(`✅  metadata.yaml written from ${input} to ${yamlOutput}`);
}

main();
