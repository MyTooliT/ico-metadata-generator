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