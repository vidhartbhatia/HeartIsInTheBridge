'''
Generic interface to program the bridge.
'''

import sys


class Bridge(object):
  '''Generic interface for the bridge.'''
  START_SEQ = 1
  END_SEQ = 200

  def set_top(self, r, g, b, w, panels=None):
    raise NotImplementedError()
  def set_bottom(self, r, g, b, w, panels=None):
    raise NotImplementedError()
  def render(self):
    raise NotImplementedError()


class PauschBridge(Bridge):
  '''API to access the Pausch Bridge'''

  def __init__(self):
    '''Initialize the Pausch Bridge.'''
    try: import lumiversepython as L
    except: raise ImportError(
      'Couldn\'t import lumiversepython: ' +
      'Are you running on pbridge.adm.cs.cmu.edu?')
    self.rig = L.Rig("/home/teacher/Lumiverse/PBridge.rig.json")
    self.rig.init()
    # Cache the panel objects into an array for speedy lookup.
    # Gates side has sequence 1.
    self.top_panels = [
      self.rig.select("$side=top[$sequence={0}]".format(i))
      for i in xrange(Bridge.START_SEQ, Bridge.END_SEQ+1)]
    self.bottom_panels = [
      self.rig.select("$side=bot[$sequence={0}]".format(i))
      for i in xrange(Bridge.START_SEQ, Bridge.END_SEQ+1)]
    [panel.setRGBRaw(0, 0, 0) for panel in self.top_panels]
    [panel.setRGBRaw(0, 0, 0) for panel in self.bottom_panels]

  def set_top(self, r, g, b, w, panels = None):
    if panels is None:
      [panel.setRGBRaw(r, g, b, w) for panel in self.top_panels]
    else:
      for panel in panels:
        self.top_panels[panel].setRGBRaw(r, g, b, w)

  def set_bottom(self, r, g, b, w, panels = None):
    if panels is None:
      [panel.setRGBRaw(r, g, b, w) for panel in self.bottom_panels]
    else:
      for panel in panels:
        self.bottom_panels[panel].setRGBRaw(r, g, b, w)

  def render(self):
    self.rig.updateOnce()


class SimulatedBridge(Bridge):
  '''A simulated bridge, useful for testing.'''

  def __init__(self):
    import Tkinter
    self.width = 1000
    self.height = 100
    self.root = Tkinter.Tk()
    self.canvas = Tkinter.Canvas(
      self.root, width=self.width, height=self.height)
    self.canvas.pack()
    self.canvas.configure(background='white')

    self.top = [(0, 0, 0, 0) for _ in xrange(Bridge.START_SEQ, Bridge.END_SEQ+1)]
    self.bottom = [(0, 0, 0, 0) for _ in xrange(Bridge.START_SEQ, Bridge.END_SEQ+1)]

    self.render_count = 0

  def set_top(self, r, g, b, w, panels=None):
    for i in panels:
      self.top[i] = (r, g, b, w)

  def set_bottom(self, r, g, b, w, panels=None):
    for i in panels:
      self.bottom[i] = (r, g, b, w)

  def render(self):
    self.render_count += 1
    if self.render_count % 2 != 0:
      return

    import Tkinter
    self.canvas.delete(Tkinter.ALL)

    w = float(self.width) / len(self.top)
    h = float(self.height) / 2.0

    for i, (top, bottom) in enumerate(zip(self.top, self.bottom)):
      tc, tw = top[:3], top[3]
      bc, bw = bottom[:3], bottom[3]

      tc = self.get_weighted_rgb(tc, tw)
      bc = self.get_weighted_rgb(bc, bw)

      tc = self.to8bit(*tc)
      bc = self.to8bit(*bc)

      x0 = i * w
      x1 = x0 + w

      self.canvas.create_rectangle(x0, 0, x1, self.height/2,
        fill=self.get_rgb_string(*tc))
      self.canvas.create_rectangle(x0, self.height/2, x1, self.height,
        fill=self.get_rgb_string(*bc))

    self.root.update()

  @staticmethod
  def to8bit(r, g, b):
    r = min(max(int(round(r * 255)), 0), 255)
    g = min(max(int(round(g * 255)), 0), 255)
    b = min(max(int(round(b * 255)), 0), 255)
    return r, g, b

  @staticmethod
  def get_weighted_rgb(rgb, w):
    import colorsys
    h, s, v = colorsys.rgb_to_hsv(*rgb)
    v *= w
    return colorsys.hsv_to_rgb(h, s, v)

  @staticmethod
  def get_rgb_string(r, g, b):
    return '#%0.2X%0.2X%0.2X' % (r, g, b)


class CombinedBridge(Bridge):
  '''Combine multiple Bridge instances'''

  def __init__(self, bridges):
    self.bridges = bridges

  def set_top(self, r, g, b, w, panels=None):
    for bridge in self.bridges:
      bridge.set_top(r, g, b, w, panels=panels)

  def set_bottom(self, r, g, b, w, panels=None):
    for bridge in self.bridges:
      bridge.set_bottom(r, g, b, w, panels=panels)

  def render(self):
    for bridge in self.bridges:
      bridge.render()

