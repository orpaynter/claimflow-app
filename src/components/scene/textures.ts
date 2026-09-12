import * as THREE from "three";

function canvas(size: number) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("canvas");
  return { c, ctx };
}

function toTex(c: HTMLCanvasElement, repeatX: number, repeatY: number) {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function makeClapboard(hex: string) {
  const { c, ctx } = canvas(256);
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = "rgba(0,0,0,0.16)";
  ctx.lineWidth = 2;
  for (let y = 8; y < 256; y += 18) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  for (let y = 6; y < 256; y += 18) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  return toTex(c, 2, 3);
}

export function makeShingles(hex: string) {
  const { c, ctx } = canvas(256);
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, 256, 256);
  const row = 18;
  for (let y = 0; y < 256; y += row) {
    const offset = (y / row) % 2 === 0 ? 0 : 16;
    ctx.strokeStyle = "rgba(0,0,0,0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
    for (let x = offset; x < 256; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + row);
      ctx.stroke();
    }
  }
  return toTex(c, 4, 3);
}

export function makeGrass() {
  const { c, ctx } = canvas(256);
  ctx.fillStyle = "#3d4a34";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.fillStyle = `rgba(${40 + Math.random() * 50},${70 + Math.random() * 50},${30 + Math.random() * 30},${0.35 + Math.random() * 0.4})`;
    ctx.fillRect(x, y, 2, 4);
  }
  return toTex(c, 18, 18);
}

export function makeStone(hex: string) {
  const { c, ctx } = canvas(128);
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  for (let y = 0; y < 128; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y);
    ctx.stroke();
    const off = (y / 16) % 2 === 0 ? 0 : 18;
    for (let x = off; x < 128; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 16);
      ctx.stroke();
    }
  }
  return toTex(c, 3, 1);
}
