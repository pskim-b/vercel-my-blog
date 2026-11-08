import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyPost, canAccessPost, taxonomy } from '../src/lib/taxonomy.mjs';
import { validateTistoryTaxonomy } from '../src/lib/tistory-taxonomy.mjs';

test('explicit private migration mappings preserve source labels while choosing the requested target',()=>{
  const labels=['book','tistory'];
  const result=classifyPost({scope:'private',isPublic:false,label:labels,category:'old category',migration:{source:'tistory',taxonomy:{section:'exercise',type:'saxophone',topicPaths:[]}}});
  assert.equal(result.section,'exercise');assert.equal(result.type,'saxophone');
  assert.deepEqual(result.labels,labels);assert.deepEqual(result.issues,[]);
  assert.equal(classifyPost({label:['tistory','경제']}).section,'unclassified');
});

test('public posts cannot use migration assignments to bypass restricted source labels',()=>{
  const post={scope:'public',isPublic:true,label:['journal'],migration:{source:'tistory',taxonomy:{section:'reflections',type:'book',topicPaths:[]}}};
  assert.equal(classifyPost(post).section,'journal');assert.equal(canAccessPost(post,false),false);
});

test('target assignments require catalog types and valid topic paths',()=>{
  assert.throws(()=>validateTistoryTaxonomy({section:'reflections'},taxonomy));
  assert.throws(()=>validateTistoryTaxonomy({section:'tech',topicPaths:[]},taxonomy));
  assert.throws(()=>validateTistoryTaxonomy({section:'exercise',type:'book'},taxonomy));
  assert.throws(()=>validateTistoryTaxonomy({section:'tech',topicPaths:['a/b/c/d']},taxonomy));
  assert.throws(()=>validateTistoryTaxonomy({section:'tech',topicPaths:{}},taxonomy));
  assert.deepEqual(validateTistoryTaxonomy({section:'tech',topicPaths:['java','java/spring']},taxonomy),{section:'tech',type:null,topicPaths:['java/spring']});
  for(const type of ['travel','music'])assert.equal(classifyPost({label:[type]}).type,type);
});

test('Hugo private assignments choose target topics without changing provenance or public access',()=>{
  const post={scope:'private',isPublic:false,label:['hugo','msa'],migration:{source:'hugo',taxonomy:{section:'tech',type:null,topicPaths:['design/architecture/msa']}}};
  const result=classifyPost(post);
  assert.equal(result.section,'tech');assert.deepEqual(result.topicPaths,['design/architecture/msa']);
  assert.ok(result.labels.includes('hugo'));assert.equal(canAccessPost(post,false),false);
  const publicPost={...post,scope:'public',isPublic:true,label:['journal']};
  assert.equal(classifyPost(publicPost).section,'journal');assert.equal(canAccessPost(publicPost,false),false);
});
