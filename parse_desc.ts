export const extractIncludedFromDesc = (desc: string) => {
  const fans = desc.match(/(\d+)\s*(?:מאוורר|מאווררים|fan|fans)/i)?.[1] || '';
  const wheels = desc.match(/(\d+)\s*(?:גלגל|גלגלים|wheel|wheels)/i)?.[1] || '';
  const feet = desc.match(/(\d+)\s*(?:רגל|רגליות|רגליים|feet)/i)?.[1] || '';
  const shelves = desc.match(/(\d+)\s*(?:מדף|מדפים|shelf)/i)?.[1] || '';
  return { fans, wheels, feet, shelves };
};
console.log(extractIncludedFromDesc("ארון תקשורת כולל 4 מאווררים ו-2 מדפים"));
