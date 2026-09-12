import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const target1 = `          const scrollLeft =
            activeThumb.offsetLeft -
            carousel.clientWidth / 2 +
            activeThumb.clientWidth / 2;
          carousel.scrollTo({ left: scrollLeft, behavior: "smooth" });`;

const replacement1 = `          activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });`;

const target2 = `                            const scrollLeft =
                              activeThumb.offsetLeft -
                              carousel.clientWidth / 2 +
                              activeThumb.clientWidth / 2;
                            carousel.scrollTo({
                              left: scrollLeft,
                              behavior: "smooth",
                            });`;
const replacement2 = `                            activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });`;

content = content.replace(target1, replacement1);
content = content.replace(target1, replacement1); // two handlePrev/Next
content = content.replace(target2, replacement2);

fs.writeFileSync('src/App.tsx', content);
