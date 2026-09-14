import re
with open('src/components/CabinetConfigurator.tsx', 'r') as f:
    text = f.read()

bad_infra = '''  const isNetworkOrAV = 
    sub.includes('מתג') || sub.includes('switch') || 
    sub.includes('נתב') || sub.includes('router') || 
    sub.includes('ליבה') || 
    sub.includes('ups') || sub.includes('אל פסק') || 
    sub.includes('nvr') || sub.includes('dvr') || 
    sub.includes('מגבר') || sub.includes('audio') || sub.includes('שמע') ||
    sub.includes('בקר') || sub.includes('controller') ||
    cat.includes('hikvision') || cat.includes('polman');'''

good_infra = '''  const isNetworkOrAV = 
    sub.includes('מתג') || sub.includes('switch') || 
    sub.includes('נתב') || sub.includes('router') || 
    sub.includes('ליבה') || 
    sub.includes('ups') || sub.includes('אל פסק') || 
    sub.includes('nvr') || sub.includes('dvr') || 
    sub.includes('מגבר') || sub.includes('audio') || sub.includes('שמע') ||
    sub.includes('בקר') || sub.includes('controller');'''

text = text.replace(bad_infra, good_infra)
with open('src/components/CabinetConfigurator.tsx', 'w') as f:
    f.write(text)
