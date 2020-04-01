(this.webpackJsonpfe=this.webpackJsonpfe||[]).push([[0],{47:function(e,t,a){e.exports=a(60)},60:function(e,t,a){"use strict";a.r(t);var n=a(0),r=a.n(n),c=a(8),o=a.n(c),u=a(11),i=a(12),s=a(25),l=a(10),f=a(89),d=a(93),m=a(94),b=a(95),O=a(98),v=a(96),g=a(97),j=a(39),p=a.n(j),E=a(99),h=window.location,S=h.hostname,y=h.port,k=h.protocol,I="".concat("https:"===k?"wss:":"ws:","//").concat(S,":").concat(["3000","3001","3002","3003"].includes(y)?8080:y),C=function(e){var t={width:480,height:270},a={width:960,height:540},c=Object(n.useState)(t),o=Object(l.a)(c,2),u=o[0],i=o[1];return r.a.createElement(f.a,{style:{padding:"10px"}},r.a.createElement("img",{alt:e.frame.user,onClick:function(){return i((function(e){return 480===e.width?a:t}))},style:Object(s.a)({},u,{border:"solid lightgrey 2px",transform:"rotate(".concat(e.frame.rotation,"deg)")}),src:e.frame.frame}),r.a.createElement(d.a,{variant:"subtitle1"},e.frame.user))};o.a.render(r.a.createElement((function(){var e=Object(n.useState)({}),t=Object(l.a)(e,2),a=t[0],c=t[1],o=Object(n.useState)(""),f=Object(l.a)(o,2),d=f[0],j=f[1],h=Object(n.useState)(localStorage.getItem("username")||"anonymous"),S=Object(l.a)(h,2),y=S[0],k=S[1],w=Object(n.useState)([]),N=Object(l.a)(w,2),A=N[0],T=N[1],M=Object(n.useState)(),P=Object(l.a)(M,2),x=P[0],F=P[1],U=Object(n.useState)({}),D=Object(l.a)(U,2),J=D[0],L=D[1],R=Object(n.useState)(!1),V=Object(l.a)(R,2),G=V[0],K=V[1],B=Object(n.useState)(5),W=Object(l.a)(B,2),q=W[0],z=W[1],H=Object(n.useState)(0),Q=Object(l.a)(H,2),X=Q[0],Y=Q[1],Z=function(){var e=localStorage.getItem("sessionId");if(e)return e;var t=Object(E.a)();return localStorage.setItem("sessionId",t),t}(),$=Object(n.useMemo)((function(){return{shouldReconnect:function(){return!0},reconnectAttempts:10,reconnectInterval:3e3}}),[]),_=["CONNECTING","OPEN","CLOSING","CLOSED"],ee=p()("".concat(I,"/socket"),$),te=Object(l.a)(ee,3),ae=te[0],ne=te[1],re=te[2],ce=Object(n.useCallback)((function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};return ae(JSON.stringify(Object(s.a)({},t,{type:e})))}),[ae]);Object(n.useEffect)((function(){ne||"OPEN"!==_[re]||ce("LoadMessages")}),[re,ne,_,ce]),Object(n.useEffect)((function(){if(ne){var e=JSON.parse(ne.data);switch(e.type){case"Message":c((function(t){return Object(s.a)({},t,Object(i.a)({},e.id,e))}));break;case"VideoFrame":L((function(t){return Object(s.a)({},t,Object(i.a)({},e.sessionId,e))}))}}}),[ne]),Object(n.useEffect)((function(){G?x||navigator.mediaDevices.getUserMedia({audio:!1,video:{noiseSuppression:!0}}).then(F).catch((function(e){"ConstraintNotSatisfiedError"===e.name?T((function(e){return[].concat(Object(u.a)(e),["The resolution x px is not supported by your device."])})):"PermissionDeniedError"===e.name&&T((function(e){return[].concat(Object(u.a)(e),["Permissions have not been granted to use your camera and microphone, you need to allow the page access to your devices in order for the demo to work."])})),T((function(t){return[].concat(Object(u.a)(t),["getUserMedia error: "+e.name])}))})):x&&(x.getTracks().forEach((function(e){return e.stop()})),F(void 0),T([]))}),[G,x]);var oe=Object(n.useCallback)((function(){var e;"OPEN"===_[re]&&"live"===(null===x||void 0===x||null===(e=x.getVideoTracks()[0])||void 0===e?void 0:e.readyState)&&new ImageCapture(x.getVideoTracks()[0]).takePhoto().then((function(e){var t=new FileReader;t.readAsDataURL(e),t.onloadend=function(){ce("SendSnapshot",{sessionId:Z,frame:t.result,user:y,rotation:X})}}))}),[_,re,x]);Object(n.useEffect)((function(){if(G){var e=setInterval((function(){return oe()}),1e3*q);return function(){clearTimeout(e)}}}),[G,q,oe]);var ue=function(){d.trim()&&function(e,t){return Promise.resolve(ce("AddMessage",{message:e,user:t}))}(d.trim(),y).then((function(){return j("")}))};return r.a.createElement(r.a.Fragment,null,r.a.createElement(m.a,{container:!0},r.a.createElement(m.a,{container:!0,item:!0,lg:10},Object.values(J).map((function(e){return r.a.createElement(m.a,{key:e.sessionId,item:!0},r.a.createElement(C,{frame:e}))}))),r.a.createElement(m.a,{item:!0,lg:2},r.a.createElement("div",null,"Websocket is ",_[re]),r.a.createElement(b.a,{variant:"contained",onClick:function(){return K((function(e){return!e}))}},"Toggle video (",G?"On":"Off",")"),r.a.createElement("ul",null,A.map((function(e){return r.a.createElement("li",null,e)}))),r.a.createElement(O.a,{variant:"filled",label:"Snapshot delay (s)",value:q,type:"number",onChange:function(e){parseInt(e.target.value,10)>0&&z(parseInt(e.target.value,10))}}),r.a.createElement(b.a,{variant:"contained",onClick:function(){return Y((function(e){return(e+90)%360}))}},"Rotation"),r.a.createElement(O.a,{variant:"filled",label:"User",autoFocus:!0,value:y,onChange:function(e){localStorage.setItem("username",e.target.value),k(e.target.value)}}),r.a.createElement(O.a,{variant:"filled",label:"Type your message",autoFocus:!0,value:d,onChange:function(e){return j(e.target.value)},onKeyUp:function(e){e.ctrlKey&&e.key&&ue()}}),r.a.createElement(b.a,{variant:"contained",onClick:ue},"Send Message (ctrl+\u23ce)"),r.a.createElement(v.a,null,Object.values(a).sort((function(e,t){return e.createdAt>t.createdAt?1:e.createdAt<t.createdAt?-1:0})).map((function(e){return r.a.createElement(g.a,{key:e.createdAt},e.createdAt.slice(11,19)," [",e.user,"]: ",e.message)}))))))}),null),document.getElementById("root"))}},[[47,1,2]]]);
//# sourceMappingURL=main.f5875b5f.chunk.js.map