const svg = document.querySelector('svg');
const g = svg && svg.querySelector('g[transform]');
const t = g ? g.getAttribute('transform') : '';
const vb = svg ? svg.getAttribute('viewBox') : '';
const rect = svg ? svg.getBoundingClientRect() : null;
const scale = (t && t.match(/scale\(([^)]+)\)/)) ? t.match(/scale\(([^)]+)\)/)[1] : '';
console.log('zoom=' + scale + ' viewBox=' + vb + ' svgSize=' + (rect? Math.round(rect.width)+'x'+Math.round(rect.height):'?'));
