# ico-metadata-generator
Node.js tool for generating metadata YAML files from XLSX files for ICOapi measurement metadata configuration.

## Installation

1) Clone this repository
2) Install [Node.js](https://nodejs.org/en)
3) Inside the cloned folder, run ``npm install``

## Usage

``npm run generate`` expects a file named `metadata.xlsx` in the root and outputs `metadata.yaml` there.

If you wish to specify paths, run:

``node generate-config.js <path-to-xlsx> <path-to-yaml>``

## Examples

See the ``metadata.xlsx`` file and the ``metadata.yaml`` file it generated.

## Details

The metadata.xlsx has the following sheets:

### fields

This is where all available fields need to be entered, no matter in which profile they appear or not.

- id: must be unique
- label: displayed name of the field
- datatype: determines the UI element for the field
    - text: simple text input
    - dropdown: select/dropdown **not editable** --> see **lists sheet**
    - text_suggestions: text input, but with on-type suggestions --> see **lists sheet**
    - float: number input with 4 decimal places (komma, not dot notation!)
    - int: integer number input
    - boolean: renders a checkbox
    - file: currently only renders the CustomFileUpload component which is only for images
    - text_box: renders a resizable textbox
- unit: is displayed next to the field label and stored alongside the entered value
- type: determines how the field is handled
    - default: empty (or prefilled if default values are given) field
    - implementation: suggests that this field will be computed, but **that computation must be handled manually**
    - range: currently not respected; intended for fields which get set as a range between bounds (e.g. for cutting along a sloped line)

### categories

These are the categories that split the fields into different sections when rendered in the client. They only consist of:

- id: unique identifier
- display_name: displayed name as a section heading

### lists

This is the **lists sheet** mentioned for _dropdown_ and _text_suggestion_ fields.

Every column has an ID from a field which's type is dropdown or text_suggestions as a header in the first row (case
sensitive) and then lists available options.

These options are rendered as-is (and not via a key-value lookup for e.g. localization) and can be any text.

> Example: the column with the header _workpiece_material_ contains options rendered for the text-suggestion field with the title _Workpiece Material_ **whereever** it is used.

### info

This sheet is for any arbitrary information relevant to the setup. Currently it holds:

`````yaml
schema_name: metadata_schema
schema_version: 0.0.1
config_name: Metadata Disabled
config_date: 
config_version: disabled
`````

The `schema_version` should be incremented whenever you change something as it will be used to provide the structure for
analysis programs. 

The `config_version` should be incremented when anything about the config changes. In addition, setting it to `disabled`
will disable the system.

Leave the `config_date` blank as the generation script will auto-generate this field in the proper ISO-format.

### default

This only holds the ``default_profile_id`` which sets the default used profile in the client.

### _pre__ and _post__

All other sheets will contain the prefixes _pre__ and _post__ with the rest of the sheet name **equal for any pair**.

This controls the profiles that can be selected in the application.

Everything in the _pre__ sheet will be displayed on the measurement page while everything in the _post__ sheet will be
in the modal that pops up after the measurement. Their structure is:

- id: unique identifier --> **needs to be equal between the _pre__ and _post__ sheet**
- display_name: how the profile is displayed --> **needs to be equal between the _pre__ and _post__ sheet**
- field_id: ID from the ``fields`` sheet
    - determines which fields are displayed in the profile
    - needs to match the field's ID exactly
- required: Whether the field is required or optional
    - required: marked with a * in the field label, also blocks measurement if not filled
    - optional: displayed, but not validated beyond basic type validation (text, integer, etc.)
    - hidden: same as not including it in the profile
- category: under what section the field is displayed
    - the script aggregates the fields per category - no need to enter them in the correct order
    - needs to match an ID from the ``categories`` sheet
- default: default value for the field if required
    - for dropdown/text_suggestion: needs to match an option from the relevant ``lists`` column
- description: currently unused; could be used for a popover/tooltip easily