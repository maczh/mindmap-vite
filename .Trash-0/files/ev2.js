var g=[].slice.call(document.querySelectorAll('.mm-node')).find(function(e){return e.textContent.indexOf('套餐')>=0;});
if(!g){ 'no-node'; } else {
  var m=g.getAttribute('transform').match(/translate\(([-\d.]+),([-\d.]+)\)/);
  var X=parseFloat(m[1]), Y=parseFloat(m[2]);
  var bb=g.getBBox();
  var wx=X+bb.width/2, wy=Y+bb.height/2;
  var root=document.querySelector('g.mm-root');
  var vw=window.innerWidth, vh=window.innerHeight;
  var s=1.9;
  var tx=vw/2 - wx*s, ty=vh/2 - wy*s;
  root.setAttribute('transform','translate('+tx.toFixed(1)+','+ty.toFixed(1)+') scale('+s+')');
  'zoomed s='+s+' center=('+wx.toFixed(1)+','+wy.toFixed(1)+')';
}
