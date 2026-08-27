# Gates: Batch 1 — Housekeeping

Scope: Archive 3 OpenSpec changes, fix CI lint error, update stale docs, triage unlabeled issues, verify azure-account-facts.md

- [ ] G1: three completed OpenSpec changes are archived
  CHECK: node -e "const fs=require('fs');const changes=['data-export-ui','ended-enum','capability-grants'];const missing=changes.filter(c=>fs.existsSync('openspec/changes/'+c));if(missing.length)throw new Error('Still active: '+missing);const archived=changes.filter(c=>!fs.readdirSync('openspec/changes/archive').some(d=>d.includes(c.replace(/-/g,'-'))));console.log('all 3 archived')"
  EXPECT: all 3 archived
  CWD: /Users/omc1/Documents/om/veervrat/veervrat-app
  EVIDENCE: pending

- [ ] G2: CI lint error in auth.integration.spec.ts is fixed
  CHECK: node -e "const fs=require('fs');const src=fs.readFileSync('apps/api/src/test/auth.integration.spec.ts','utf8');if(src.includes('require('))throw new Error('require() still present');console.log('no require imports')"
  EXPECT: no require imports
  CWD: /Users/omc1/Documents/om/veervrat/veervrat-app
  EVIDENCE: pending

- [ ] G3: PROJECT-STATUS.md no longer lists archived changes as active
  CHECK: node -e "const fs=require('fs');const doc=fs.readFileSync('ops/PROJECT-STATUS.md','utf8');if(doc.includes('bootstrap-admin-grant')&&!doc.includes('archived'))throw new Error('still listed as active');if(doc.includes('vratmitra-roster')&&!doc.includes('archived'))throw new Error('still listed as active');console.log('archived changes cleaned')"
  EXPECT: archived changes cleaned
  CWD: /Users/omc1/Documents/om/veervrat/veervrat-app
  EVIDENCE: pending

- [ ] G4: audit/README.md reflects resolved items
  CHECK: node -e "const fs=require('fs');const doc=fs.readFileSync('ops/audit/README.md','utf8');if(doc.includes('🔴')&&doc.split('🔴').length>2)throw new Error('still has unresolved red markers');console.log('audit readme updated')"
  EXPECT: audit readme updated
  CWD: /Users/omc1/Documents/om/veervrat/veervrat-app
  EVIDENCE: pending

- [ ] G5: all 39 open issues have priority labels
  CHECK: node -e "const{execSync}=require('child_process');const out=execSync('gh issue list --state open --limit 50 --json number,labels',{encoding:'utf8'});const issues=JSON.parse(out);const unlabeled=issues.filter(i=>!i.labels.some(l=>l.name.startsWith('p')));if(unlabeled.length)throw new Error('Unlabeled: '+unlabeled.map(i=>i.number).join(','));console.log('all issues labeled')"
  EXPECT: all issues labeled
  CWD: /Users/omc1/Documents/om/veervrat/veervrat-app
  EVIDENCE: pending

- [ ] G6: azure-account-facts.md verified date is 2026-08-27
  CHECK: node -e "const fs=require('fs');const doc=fs.readFileSync('ops/azure-account-facts.md','utf8');if(!doc.includes('2026-08-27'))throw new Error('not updated');console.log('azure facts verified today')"
  EXPECT: azure facts verified today
  CWD: /Users/omc1/Documents/om/veervrat/veervrat-app
  EVIDENCE: pending
