import fs from 'node:fs';
import path from 'node:path';
import { taxonomy } from '../src/lib/taxonomy.mjs';
import { validateTistoryTaxonomy } from '../src/lib/tistory-taxonomy.mjs';

const args=process.argv.slice(2);
const option=name=>args.includes(name)?args[args.indexOf(name)+1]:undefined;
const workArg=option('--workdir');
const rulesArg=option('--rules');
if(!workArg||!rulesArg||!path.isAbsolute(workArg)||!path.isAbsolute(rulesArg))throw new Error('--workdir and --rules must be external absolute paths');
const work=fs.realpathSync(workArg);
if(work===process.cwd()||work.startsWith(process.cwd()+path.sep))throw new Error('Keep migration decisions outside the public repository');
const source=JSON.parse(fs.readFileSync(path.join(work,'inventory.json'),'utf8'));
const rules=JSON.parse(fs.readFileSync(rulesArg,'utf8'));
const entries={};
const rows=[];
for(const record of source.records){
  const category=record.originalCategory;
  let rule=rules.exact[category];
  let ruleName=rule?category:null;
  if(!rule&&category.startsWith(rules.techPrefix+'/')){
    const leaf=category.slice(rules.techPrefix.length+1);
    const topic=rules.techTopics[leaf];
    if(!topic)throw new Error(`Unmapped IT subcategory: ${leaf}`);
    rule={target:{section:'tech',type:null,topicPaths:[topic]},addLabels:[]};ruleName=rules.techPrefix+'/'+leaf;
  }
  const inferred=!rule;
  rule??=rules.fallback;
  const target=validateTistoryTaxonomy(rule.target,taxonomy);
  const assignment={target,addLabels:rule.addLabels??[],rule:ruleName??'unmapped-original-category'};
  entries[record.originalId]=assignment;
  rows.push({originalId:record.originalId,originalCategory:category,target,addLabels:assignment.addLabels,rule:assignment.rule,awaitingCategoryDecision:inferred});
}
process.umask(0o077);
fs.writeFileSync(path.join(work,'taxonomy-assignments.json'),JSON.stringify({version:1,entries},null,2)+'\n',{mode:0o600});
const counts={};for(const r of rows)counts[r.target.section]=(counts[r.target.section]??0)+1;
const pending=rows.filter(r=>r.awaitingCategoryDecision);
fs.writeFileSync(path.join(work,'taxonomy-mapping-report.json'),JSON.stringify({summary:{total:rows.length,bySection:counts,pendingOriginalCategory:pending.length},rows},null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({total:rows.length,bySection:counts,pendingOriginalCategory:pending.length},null,2));
