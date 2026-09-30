var cards=[].slice.call(document.querySelectorAll('.mm-structure-card'));
var t=cards.find(function(c){return /时间轴/.test(c.textContent);});
if(t){ t.click(); 'clicked'; } else { 'no-card'; }
