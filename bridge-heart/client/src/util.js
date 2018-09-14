module.exports = {
  toRGBString: (rgb, scale) => {
    const r = Math.min(255, Math.round(scale ? rgb.r * 255 : rgb.r));
    const g = Math.min(255, Math.round(scale ? rgb.g * 255 : rgb.g));
    const b = Math.min(255, Math.round(scale ? rgb.b * 255 : rgb.b));
    return 'rgb('+r+','+g+','+b+')';
  }
};
