const fs = require('fs');
const Papa = require('papaparse');

async function main() {
    const res = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vT1FhQpP5e1t1FhQpP5e1t/pub?output=csv');
    // Actually the proxy is mapped in App.tsx! Let's get the URL.
}
main();
