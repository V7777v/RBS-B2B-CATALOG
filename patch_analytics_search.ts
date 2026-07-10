import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const hookToInsert = `
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery.trim()) {
        trackEvent('search', { search_term: searchQuery });
      }
    }, 1500); // 1.5 second debounce for search tracking

    return () => clearTimeout(handler);
  }, [searchQuery]);
`;

content = content.replace("  const [searchQuery, setSearchQuery] = useState('');", "  const [searchQuery, setSearchQuery] = useState('');\n" + hookToInsert);

fs.writeFileSync('src/App.tsx', content);
