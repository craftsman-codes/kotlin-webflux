(this.webpackJsonpfe=this.webpackJsonpfe||[]).push([[0],{47:function(e,t,n){e.exports=n(60)},60:function(e,t,n){"use strict";n.r(t);var a=n(0),r=n.n(a),c=n(7),o=n.n(c),i=n(12),u=n(11),s=n(28),l=n(10),f=n(88),d=n(92),m=n(93),b=n(96),O=n(94),v=n(95),j=n(39),g=n.n(j),E=window.location,h=E.hostname,p=E.port,k=E.protocol,y="".concat("https:"===k?"wss:":"ws:","//").concat(h,":").concat(["3000","3001","3002","3003"].includes(p)?8080:p),S=function(e){var t={width:480,height:270},n={width:960,height:540},c=Object(a.useState)(t),o=Object(l.a)(c,2),i=o[0],u=o[1];return r.a.createElement("img",{onClick:function(){u((function(e){return 480===e.width?n:t}))},style:i,src:e.frame||void 0})};o.a.render(r.a.createElement((function(){var e=Object(a.useState)([]),t=Object(l.a)(e,2),n=t[0],c=t[1],o=Object(a.useState)(""),j=Object(l.a)(o,2),E=j[0],h=j[1],p=Object(a.useState)("anonymous"),k=Object(l.a)(p,2),w=k[0],C=k[1],N=Object(a.useState)([]),P=Object(l.a)(N,2),T=P[0],I=P[1],M=Object(a.useState)(),U=Object(l.a)(M,2),A=U[0],F=U[1],J=Object(a.useState)({}),L=Object(l.a)(J,2),D=L[0],V=L[1],x=Object(a.useState)(!1),R=Object(l.a)(x,2),G=R[0],K=R[1],B=Object(a.useMemo)((function(){return{shouldReconnect:function(){return!0},reconnectAttempts:10,reconnectInterval:3e3}}),[]),W=["CONNECTING","OPEN","CLOSING","CLOSED"],q=g()("".concat(y,"/socket"),B),z=Object(l.a)(q,3),H=z[0],Q=z[1],X=z[2],Y=Object(a.useCallback)((function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};return H(JSON.stringify(Object(s.a)({},t,{messageType:e})))}),[H]);Object(a.useEffect)((function(){Q||"OPEN"!==W[X]||Y("LoadMessages")}),[X,Q,W,Y]),Object(a.useEffect)((function(){if(Q){var e=JSON.parse(Q.data);switch(console.log(e),e.type){case"Message":c((function(t){return[].concat(Object(u.a)(t),[e])}));break;case"JoiningUser":V((function(t){return Object(s.a)({},t,Object(i.a)({},e.joining,null))}));break;case"LeavingUser":V((function(t){return Object.fromEntries(Object.entries(t).filter((function(t){return Object(l.a)(t,1)[0]!=e.leaving})))}));break;case"SessionVideoFrame":D.hasOwnProperty(e.sessionId)&&V((function(t){return Object(s.a)({},t,Object(i.a)({},e.sessionId,e.frame))}))}}}),[Q]),Object(a.useEffect)((function(){G?navigator.mediaDevices.getUserMedia({audio:!1,video:{noiseSuppression:!0}}).then(F).catch((function(e){"ConstraintNotSatisfiedError"===e.name?I((function(e){return[].concat(Object(u.a)(e),["The resolution x px is not supported by your device."])})):"PermissionDeniedError"===e.name&&I((function(e){return[].concat(Object(u.a)(e),["Permissions have not been granted to use your camera and microphone, you need to allow the page access to your devices in order for the demo to work."])})),I((function(t){return[].concat(Object(u.a)(t),["getUserMedia error: "+e.name])}))})):(null===A||void 0===A||A.getTracks().forEach((function(e){return e.stop()})),F(void 0),I([]))}),[G]);var Z=function(){E.trim()&&function(e,t){return Promise.resolve(Y("AddMessage",{message:e,user:t}))}(E.trim(),w).then((function(){return h("")}))};return r.a.createElement(f.a,null,r.a.createElement(d.a,{container:!0},r.a.createElement(d.a,{container:!0,item:!0,lg:10},Object.entries(D).map((function(e){var t=Object(l.a)(e,2),n=t[0],a=t[1];return r.a.createElement(d.a,{item:!0},r.a.createElement("div",null,n),r.a.createElement(S,{key:n,frame:a}))}))),r.a.createElement(d.a,{item:!0,lg:2},r.a.createElement("div",null,"Websocket is ",W[X]),r.a.createElement(m.a,{variant:"contained",onClick:function(){return K((function(e){return!e}))}},"Toggle video (",G?"On":"Off",")"),r.a.createElement(m.a,{variant:"contained",onClick:function(){var e;"OPEN"===W[X]&&A&&"live"===(null===A||void 0===A||null===(e=A.getVideoTracks()[0])||void 0===e?void 0:e.readyState)&&new ImageCapture(A.getVideoTracks()[0]).takePhoto().then((function(e){var t=new FileReader;t.readAsDataURL(e),t.onloadend=function(){Y("VideoFrame",{frame:t.result,user:"test"})}}))}},"Send snapshot"),r.a.createElement("ul",null,T.map((function(e){return r.a.createElement("li",null,e)}))),r.a.createElement(b.a,{variant:"filled",label:"User",autoFocus:!0,value:w,onChange:function(e){return C(e.target.value)}}),r.a.createElement(b.a,{variant:"filled",label:"Type your message",autoFocus:!0,value:E,onChange:function(e){return h(e.target.value)},onKeyUp:function(e){e.ctrlKey&&e.key&&Z()}}),r.a.createElement(m.a,{variant:"contained",onClick:Z},"Send Message (ctrl+\u23ce)"),r.a.createElement(O.a,null,n.map((function(e){return r.a.createElement(v.a,{key:e.createdAt},e.createdAt.slice(11,19)," [",e.user,"]: ",e.message)}))))))}),null),document.getElementById("root"))}},[[47,1,2]]]);
//# sourceMappingURL=main.f9623a45.chunk.js.map