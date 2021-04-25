/**
 * Copyright (c) 2006-2015, JGraph Ltd
 * Copyright (c) 2006-2015, Gaudenz Alder
 * Updated to ES9 syntax by David Morrissey 2021
 * Type definitions from the typed-mxgraph project
 */
import mxPoint from '../util/datatypes/mxPoint';
import mxConstants from '../util/mxConstants';
import mxRectangle from '../util/datatypes/mxRectangle';
import mxUtils from '../util/mxUtils';
import mxElbowEdgeHandler from './mxElbowEdgeHandler';

class mxEdgeSegmentHandler extends mxElbowEdgeHandler {
  constructor(state) {
    // WARNING: should be super of mxEdgeHandler!
    super(state);
  }

  /**
   * Function: getCurrentPoints
   *
   * Returns the current absolute points.
   */
  // getCurrentPoints(): mxPoint[];
  getCurrentPoints() {
    let pts = this.state.absolutePoints;

    if (pts != null) {
      // Special case for straight edges where we add a virtual middle handle for moving the edge
      const tol = Math.max(1, this.graph.view.scale);

      if (
        pts.length === 2 ||
        (pts.length === 3 &&
          ((Math.abs(pts[0].x - pts[1].x) < tol &&
            Math.abs(pts[1].x - pts[2].x) < tol) ||
            (Math.abs(pts[0].y - pts[1].y) < tol &&
              Math.abs(pts[1].y - pts[2].y) < tol)))
      ) {
        const cx = pts[0].x + (pts[pts.length - 1].x - pts[0].x) / 2;
        const cy = pts[0].y + (pts[pts.length - 1].y - pts[0].y) / 2;

        pts = [
          pts[0],
          new mxPoint(cx, cy),
          new mxPoint(cx, cy),
          pts[pts.length - 1],
        ];
      }
    }

    return pts;
  }

  /**
   * Function: getPreviewPoints
   *
   * Updates the given preview state taking into account the state of the constraint handler.
   */
  // getPreviewPoints(point: mxPoint): mxPoint[];
  getPreviewPoints(point) {
    if (this.isSource || this.isTarget) {
      return super.getPreviewPoints(point);
    }
    const pts = this.getCurrentPoints();
    let last = this.convertPoint(pts[0].clone(), false);
    point = this.convertPoint(point.clone(), false);
    let result = [];

    for (let i = 1; i < pts.length; i += 1) {
      const pt = this.convertPoint(pts[i].clone(), false);

      if (i === this.index) {
        if (Math.round(last.x - pt.x) === 0) {
          last.x = point.x;
          pt.x = point.x;
        }

        if (Math.round(last.y - pt.y) === 0) {
          last.y = point.y;
          pt.y = point.y;
        }
      }

      if (i < pts.length - 1) {
        result.push(pt);
      }

      last = pt;
    }

    // Replaces single point that intersects with source or target
    if (result.length === 1) {
      const source = this.state.getVisibleTerminalState(true);
      const target = this.state.getVisibleTerminalState(false);
      const scale = this.state.view.getScale();
      const tr = this.state.view.getTranslate();

      const x = result[0].x * scale + tr.x;
      const y = result[0].y * scale + tr.y;

      if (
        (source != null && mxUtils.contains(source, x, y)) ||
        (target != null && mxUtils.contains(target, x, y))
      ) {
        result = [point, point];
      }
    }

    return result;
  }

  /**
   * Function: updatePreviewState
   *
   * Overridden to perform optimization of the edge style result.
   */
  // updatePreviewState(edge: mxCell, point: mxPoint, terminalState: mxCellState, me: mxMouseEvent): void;
  updatePreviewState(edge, point, terminalState, me) {
    super.updatePreviewState(edge, point, terminalState, me);

    // Checks and corrects preview by running edge style again
    if (!this.isSource && !this.isTarget) {
      point = this.convertPoint(point.clone(), false);
      const pts = edge.absolutePoints;
      let pt0 = pts[0];
      let pt1 = pts[1];

      let result = [];

      for (let i = 2; i < pts.length; i += 1) {
        const pt2 = pts[i];

        // Merges adjacent segments only if more than 2 to allow for straight edges
        if (
          (Math.round(pt0.x - pt1.x) !== 0 ||
            Math.round(pt1.x - pt2.x) !== 0) &&
          (Math.round(pt0.y - pt1.y) !== 0 || Math.round(pt1.y - pt2.y) !== 0)
        ) {
          result.push(this.convertPoint(pt1.clone(), false));
        }

        pt0 = pt1;
        pt1 = pt2;
      }

      const source = this.state.getVisibleTerminalState(true);
      const target = this.state.getVisibleTerminalState(false);
      const rpts = this.state.absolutePoints;

      // A straight line is represented by 3 handles
      if (
        result.length === 0 &&
        (Math.round(pts[0].x - pts[pts.length - 1].x) === 0 ||
          Math.round(pts[0].y - pts[pts.length - 1].y) === 0)
      ) {
        result = [point, point];
      }
      // Handles special case of transitions from straight vertical to routed
      else if (
        pts.length === 5 &&
        result.length === 2 &&
        source != null &&
        target != null &&
        rpts != null &&
        Math.round(rpts[0].x - rpts[rpts.length - 1].x) === 0
      ) {
        const view = this.graph.getView();
        const scale = view.getScale();
        const tr = view.getTranslate();

        let y0 = view.getRoutingCenterY(source) / scale - tr.y;

        // Use fixed connection point y-coordinate if one exists
        const sc = this.graph.getConnectionConstraint(edge, source, true);

        if (sc != null) {
          const pt = this.graph.getConnectionPoint(source, sc);

          if (pt != null) {
            this.convertPoint(pt, false);
            y0 = pt.y;
          }
        }

        let ye = view.getRoutingCenterY(target) / scale - tr.y;

        // Use fixed connection point y-coordinate if one exists
        const tc = this.graph.getConnectionConstraint(edge, target, false);

        if (tc) {
          const pt = this.graph.getConnectionPoint(target, tc);

          if (pt != null) {
            this.convertPoint(pt, false);
            ye = pt.y;
          }
        }

        result = [new mxPoint(point.x, y0), new mxPoint(point.x, ye)];
      }

      this.points = result;

      // LATER: Check if points and result are different
      edge.view.updateFixedTerminalPoints(edge, source, target);
      edge.view.updatePoints(edge, this.points, source, target);
      edge.view.updateFloatingTerminalPoints(edge, source, target);
    }
  }

  /**
   * Overriden to merge edge segments.
   */
  // connect(edge: mxCell, terminal: mxCell, isSource: boolean, isClone: boolean, me: mxMouseEvent): mxCell;
  connect(edge, terminal, isSource, isClone, me) {
    const model = this.graph.getModel();
    let geo = edge.getGeometry();
    let result = null;

    // Merges adjacent edge segments
    if (geo != null && geo.points != null && geo.points.length > 0) {
      const pts = this.abspoints;
      let pt0 = pts[0];
      let pt1 = pts[1];
      result = [];

      for (let i = 2; i < pts.length; i += 1) {
        const pt2 = pts[i];

        // Merges adjacent segments only if more than 2 to allow for straight edges
        if (
          (Math.round(pt0.x - pt1.x) !== 0 ||
            Math.round(pt1.x - pt2.x) !== 0) &&
          (Math.round(pt0.y - pt1.y) !== 0 || Math.round(pt1.y - pt2.y) !== 0)
        ) {
          result.push(this.convertPoint(pt1.clone(), false));
        }

        pt0 = pt1;
        pt1 = pt2;
      }
    }

    model.beginUpdate();
    try {
      if (result != null) {
        geo = edge.getGeometry();

        if (geo != null) {
          geo = geo.clone();
          geo.points = result;

          model.setGeometry(edge, geo);
        }
      }

      edge = super.connect(edge, terminal, isSource, isClone, me);
    } finally {
      model.endUpdate();
    }

    return edge;
  }

  /**
   * Function: getTooltipForNode
   *
   * Returns no tooltips.
   */
  // getTooltipForNode(node: any): string;
  getTooltipForNode(node) {
    return null;
  }

  /**
   * Function: createBends
   *
   * Adds custom bends for the center of each segment.
   */
  // start(x: number, y: number, index: number): void;
  start(x, y, index) {
    super.start(x, y, index);

    if (
      this.bends != null &&
      this.bends[index] != null &&
      !this.isSource &&
      !this.isTarget
    ) {
      mxUtils.setOpacity(this.bends[index].node, 100);
    }
  }

  /**
   * Function: createBends
   *
   * Adds custom bends for the center of each segment.
   */
  createBends() {
    const bends = [];

    // Source
    let bend = this.createHandleShape(0);
    this.initBend(bend);
    bend.setCursor(mxConstants.CURSOR_TERMINAL_HANDLE);
    bends.push(bend);

    const pts = this.getCurrentPoints();

    // Waypoints (segment handles)
    if (this.graph.isCellBendable(this.state.cell)) {
      if (this.points == null) {
        this.points = [];
      }

      for (let i = 0; i < pts.length - 1; i += 1) {
        bend = this.createVirtualBend();
        bends.push(bend);
        let horizontal = Math.round(pts[i].x - pts[i + 1].x) === 0;

        // Special case where dy is 0 as well
        if (Math.round(pts[i].y - pts[i + 1].y) === 0 && i < pts.length - 2) {
          horizontal = Math.round(pts[i].x - pts[i + 2].x) === 0;
        }

        bend.setCursor(horizontal ? 'col-resize' : 'row-resize');
        this.points.push(new mxPoint(0, 0));
      }
    }

    // Target
    bend = this.createHandleShape(pts.length);
    this.initBend(bend);
    bend.setCursor(mxConstants.CURSOR_TERMINAL_HANDLE);
    bends.push(bend);

    return bends;
  }

  /**
   * Function: redraw
   *
   * Overridden to invoke <refresh> before the redraw.
   */
  // redraw(): void;
  redraw() {
    this.refresh();
    super.redraw();
  }

  /**
   * Function: redrawInnerBends
   *
   * Updates the position of the custom bends.
   */
  // redrawInnerBends(p0: mxPoint, pe: mxPoint): void;
  redrawInnerBends(p0, pe) {
    if (this.graph.isCellBendable(this.state.cell)) {
      const pts = this.getCurrentPoints();

      if (pts != null && pts.length > 1) {
        let straight = false;

        // Puts handle in the center of straight edges
        if (
          pts.length === 4 &&
          Math.round(pts[1].x - pts[2].x) === 0 &&
          Math.round(pts[1].y - pts[2].y) === 0
        ) {
          straight = true;

          if (Math.round(pts[0].y - pts[pts.length - 1].y) === 0) {
            const cx = pts[0].x + (pts[pts.length - 1].x - pts[0].x) / 2;
            pts[1] = new mxPoint(cx, pts[1].y);
            pts[2] = new mxPoint(cx, pts[2].y);
          } else {
            const cy = pts[0].y + (pts[pts.length - 1].y - pts[0].y) / 2;
            pts[1] = new mxPoint(pts[1].x, cy);
            pts[2] = new mxPoint(pts[2].x, cy);
          }
        }

        for (let i = 0; i < pts.length - 1; i += 1) {
          if (this.bends[i + 1] != null) {
            p0 = pts[i];
            pe = pts[i + 1];
            const pt = new mxPoint(
              p0.x + (pe.x - p0.x) / 2,
              p0.y + (pe.y - p0.y) / 2
            );
            const b = this.bends[i + 1].bounds;
            this.bends[i + 1].bounds = new mxRectangle(
              Math.floor(pt.x - b.width / 2),
              Math.floor(pt.y - b.height / 2),
              b.width,
              b.height
            );
            this.bends[i + 1].redraw();

            if (this.manageLabelHandle) {
              this.checkLabelHandle(this.bends[i + 1].bounds);
            }
          }
        }

        if (straight) {
          mxUtils.setOpacity(this.bends[1].node, this.virtualBendOpacity);
          mxUtils.setOpacity(this.bends[3].node, this.virtualBendOpacity);
        }
      }
    }
  }
}

export default mxEdgeSegmentHandler;