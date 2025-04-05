//@ts-check
function popup() {
  new Popup().setInnerText("This is popup").show();
}

let { mouseX, mouseY } = { mouseX: 0, mouseY: 0 };

function generateDivToCursor() {
  const div = document.createElement("div");
  div.style.position = "fixed";
  div.style.left = `${mouseX}px`;
  div.style.top = `${mouseY}px`;
  return div;
}

function debugCursorPop() {
  const div = generateDivToCursor();
  div.style.width = "100px";
  div.style.height = "30px";
  div.style.zIndex = "5";
  div.style.backgroundColor = "#777";
  div.style.border = "#f00 solid 1px";
  div.style.borderRadius = "5px";
  document.body.appendChild(div);
  cursorPops.push({ count: 0, move: false, element: div });
}

/**
 * @type {{count:number,move:boolean,element:HTMLDivElement}[]}
 */
let cursorPops = [];

function debugMovingCursorPop() {
  const div = generateDivToCursor();
  div.style.width = "100px";
  div.style.height = "30px";
  div.style.zIndex = "5";
  div.style.backgroundColor = "#777";
  div.style.border = "#00f solid 1px";
  div.style.borderRadius = "5px";
  document.body.appendChild(div);
  cursorPops.push({ count: 0, move: true, element: div });
}

document.addEventListener("mousemove", (ev) => {
  mouseX = ev.clientX;
  mouseY = ev.clientY;
  cursorPops.forEach((el) => {
    if (!el.move) return;
    el.element.style.left = `${mouseX}px`;
    el.element.style.top = `${mouseY}px`;
  });
});
document.addEventListener("click", (ev) => {
  cursorPops.forEach((el) => {
    el.count++;
    if (el.count > 1) {
      el.element.remove();
    }
  });
  cursorPops = cursorPops.filter((e) => e.count < 2);
});
