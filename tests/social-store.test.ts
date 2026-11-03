import { strict as assert } from "node:assert";
import { test } from "node:test";
import { useSocialCallStore } from "../src/store/social-call-store";

test("ack settles a pending message and late history keeps newly received messages", () => {
  const s = useSocialCallStore.getState;
  s().resetSession();
  s().addMessage({id:"c1",cid:"c1",from:"Me",to:"Peer",text:"hi",ts:10,pending:true},"Peer");
  s().resolvePending("c1",{id:1,from:"Me",to:"Peer",text:"hi",ts:11},"Peer");
  assert.equal(s().chats.peer.length,1);
  assert.ok(!s().chats.peer[0].pending);
  s().addMessage({id:2,from:"Peer",to:"Me",text:"hello",ts:12},"Peer");
  s().setHistory("Peer",[{id:1,from:"Me",to:"Peer",text:"hi",ts:11}]);
  assert.deepEqual(s().chats.peer.map(m=>m.id),[1,2]);
  s().resolvePending("c1",{id:1,from:"Me",to:"Peer",text:"hi",ts:11},"Peer");
  assert.equal(s().chats.peer.length,2);
});

test("retry preserves other failed messages and account reset clears private state", () => {
  const s=useSocialCallStore.getState;
  s().resetSession();
  for (const id of ["a","b"]) s().addMessage({id,cid:id,from:"Me",to:"Peer",text:id,ts:1,failed:true},"Peer");
  s().retryMessage("Peer","a");
  assert.ok(s().chats.peer[0].pending);
  assert.ok(s().chats.peer[1].failed);
  s().bumpUnread("Peer");
  s().setTyping("Peer");
  s().resetSession();
  assert.deepEqual(s().chats,{});
  assert.deepEqual(s().unread,{});
  assert.deepEqual(s().typing,{});
  assert.equal(s().connected,false);
});
