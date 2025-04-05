function popup() {
  new Popup().setInnerText("This is popup").show();
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
  clickRemoveObj.push({ count: 0, move: false, element: div });
}

function debugMovingCursorPop() {
  const div = generateDivToCursor();
  div.style.width = "100px";
  div.style.height = "30px";
  div.style.zIndex = "5";
  div.style.backgroundColor = "#777";
  div.style.border = "#00f solid 1px";
  div.style.borderRadius = "5px";
  document.body.appendChild(div);
  clickRemoveObj.push({ count: 0, move: true, element: div });
}
