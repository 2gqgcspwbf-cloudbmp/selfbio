/**
 * 你好 — Chinese, written with a monoline pen in regular script (楷书).
 *
 * Centre lines come from Make Me a Hanzi's stroke medians (stroke order and
 * direction as taught in mainland schools). Each brush stroke is curated into
 * a pen stroke: the brush's entry flourish and pressed finish are dropped, and
 * real turns — 横钩, 横撇, 撇点 and the hooks of 竖钩 / 弯钩 — stay sharp.
 * Where a median is coarse, its stroke is redrawn as a short point list that
 * follows the median through the same positions (`points`); the helper threads
 * it with a spline, smooths it and refits it with as few nodes as it needs.
 * Coordinates in the edits are in the source 1024 box (y up; the box runs from
 * y = -124 to 900 and is mapped to 0..SIZE).
 */
import { hanzi } from "../sources/cjk.mjs";

// The ink of a character is about 200 units tall, between Latin x-height (100)
// and ascender height (266), so 你好 carries the visual weight of "hello".
const SIZE = 265; // character box height
const PITCH = 246; // advance from one character box to the next

/** 你: 亻 (丿 丨) then 尔 (丿 横钩 竖钩 点 点). */
const NI = {
  0: { points: [[345, 805], [282, 663], [194, 523], [75, 378]] }, // 丿 of 亻
  // The 竖 grows out of the 撇: its cap sits a third of a pen width inside it.
  1: { points: [[262, 570], [267, 320], [264, 45]] }, // 丨
  2: { points: [[586, 808], [546, 689], [488, 568], [408, 440]] }, // 丿 of 尔
  // Pen 楷书: the hook of the 横钩 is short, straight and crisp.
  3: { points: [[513, 540], [700, 586], [816, 597], [766, 524]], corners: [2] }, // 横钩
  4: { points: [[628, 545], [628, 300], [622, 75], [610, 34], [540, 80]], corners: [3] }, // 竖钩
  5: { points: [[455, 318], [441, 240], [404, 156]] }, // 点 (left)
  6: { points: [[745, 326], [808, 266], [858, 207]] }, // 点 (right)
};

/** 好: 女 (撇点 撇 提) then 子 (横撇 弯钩 横). */
const HAO = {
  0: { points: [[320, 770], [264, 465], [218, 314], [386, 194], [402, 180]], corners: [2] }, // 撇点
  // The 撇 starts well above the 提, about a third of the way down the 撇点.
  1: { points: [[432, 625], [424, 530], [400, 420], [362, 320], [310, 230], [240, 160], [137, 97]] }, // 撇
  // 女字旁: the 横 becomes a straight rising 提 that stops at the 撇 (提不出头).
  2: { points: [[78, 446], [395, 495]] }, // 提
  3: { points: [[525, 652], [640, 682], [760, 699], [672, 540]], corners: [2] }, // 横撇
  4: { points: [[672, 540], [692, 420], [710, 280], [706, 160], [690, 90], [652, 42], [578, 102]], corners: [5] }, // 弯钩
  5: { points: [[468, 386], [925, 430]] }, // 横
};

const strokes = [...hanzi("你", { x: 0, size: SIZE, edits: NI }), ...hanzi("好", { x: PITCH, size: SIZE, edits: HAO })];

export default {
  id: "zh",
  text: "你好",
  language: "Chinese",
  lang: "zh-Hans",
  dir: "ltr",
  script: "Han",
  slantDeg: 0,
  strokeWidth: 11,
  strokes,
};
