const names = [
  "ארון תקשורת 10U",
  "UPS1000/900W Online לארון תקשורת",
  "מארז ניתוב",
  "מסד נתונים"
];
const regex = /(?:^|\s)(ארון|מסד|מארז)\s/;
names.forEach(n => console.log(n, regex.test(n)));
