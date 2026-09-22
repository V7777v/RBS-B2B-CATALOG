import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const t1 = `      }
      setTimeout(() => setQuoteSuccessMsg(''), 4000);
      
      if (userRole === 'sales_manager') {
        loadAllQuotes().then(setAgentQuotes);
      } else if (agentName) {
        loadAgentQuotes(auth.currentUser?.uid || '').then(setAgentQuotes);
      }
    } catch (error: any) {
      console.error('[Quotes] submit failed', {
        code: error?.code || error?.message || 'UNKNOWN',`;

const r1 = `      }
      setTimeout(() => setQuoteSuccessMsg(''), 4000);
      
    } catch (error: any) {
      console.error('[Quotes] submit failed', {
        code: error?.code || error?.message || 'UNKNOWN',`;

const t2 = `      sourceQuoteId: q.id
    });

    if (userRole === 'sales_manager') {
      loadAllQuotes().then(setAgentQuotes);
    } else if (agentName) {
      loadAgentQuotes(auth.currentUser?.uid || '').then(setAgentQuotes);
    }
    } catch (error: any) {
      console.error('approveQuote failed:', error);
      alert('אישור ההצעה נכשל [' + (error?.code || error?.message || 'UNKNOWN') + ']. נסה שוב או פנה לסוכן.');`;

const r2 = `      sourceQuoteId: q.id
    });

    } catch (error: any) {
      console.error('approveQuote failed:', error);
      alert('אישור ההצעה נכשל [' + (error?.code || error?.message || 'UNKNOWN') + ']. נסה שוב או פנה לסוכן.');`;

const t3 = `                                onClick={async () => {
                                  if (confirm('האם למחוק טיוטה זו?')) {
                                    await deleteQuote(q.id);
                                    if (userRole === 'sales_manager') {
                                      loadAllQuotes().then(setAgentQuotes);
                                    } else if (agentName) {
                                      loadAgentQuotes(auth.currentUser?.uid || '').then(setAgentQuotes);
                                    }
                                  }
                                }}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border-none cursor-pointer flex items-center justify-center"`;

const r3 = `                                onClick={async () => {
                                  if (confirm('האם למחוק טיוטה זו?')) {
                                    await deleteQuote(q.id);
                                  }
                                }}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border-none cursor-pointer flex items-center justify-center"`;

let fails = 0;
const pairs = [[t1, r1], [t2, r2], [t3, r3]];

for (let i = 0; i < pairs.length; i++) {
  if (content.includes(pairs[i][0])) {
    content = content.replace(pairs[i][0], pairs[i][1]);
    console.log(`Replaced t${i+1} successfully.`);
  } else {
    console.log(`t${i+1} not found!`);
    fails++;
  }
}

if (fails === 0) {
  fs.writeFileSync('src/App.tsx', content);
  console.log("SUCCESS");
} else {
  console.log("FAILED to find some blocks.");
}
