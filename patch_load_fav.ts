import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `  useEffect(() => {
    if (userUid) loadFavorites(userUid).then(setFavorites);
    else setFavorites([]);
  }, [userUid]);`;

const replace = `  useEffect(() => {
    if (userUid) loadFavorites(userUid).then(setFavorites);
    else {
      try {
        const local = localStorage.getItem('rbs_guest_favorites');
        setFavorites(local ? JSON.parse(local) : []);
      } catch {
        setFavorites([]);
      }
    }
  }, [userUid]);`;

content = content.replace(target, replace);
fs.writeFileSync('src/App.tsx', content);
