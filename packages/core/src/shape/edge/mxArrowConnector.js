/**
 * Copyright (c) 2006-2015, JGraph Ltd
 * Copyright (c) 2006-2015, Gaudenz Alder
 * Updated to ES9 syntax by David Morrissey 2021
 * Type definitions from the typed-mxgraph project
 */
import mxShape from '../mxShape';
import mxConstants from '../../util/mxConstants';
import mxUtils from '../../util/mxUtils';

/**
 * Extends {@link mxShape} to implement an new rounded arrow shape with support for waypoints and double arrows. The
 * shape is used to represent edges, not vertices.
 *
 * This shape is registered under {@link mxConstants.SHAPE_ARROW_CONNECTOR} in {@link mxCellRenderer}.
 */
class mxArrowConnector extends mxShape {
  constructor(points, fill, stroke, strokewidth, arrowWidth, spacing, endSize) {
    super();
    this.points = points;
    this.fill = fill;
    this.stroke = stroke;
    this.strokewidth = strokewidth != null ? strokewidth : 1;
    this.arrowWidth = arrowWidth != null ? arrowWidth : mxConstants.ARROW_WIDTH;
    this.arrowSpacing = spacing != null ? spacing : mxConstants.ARROW_SPACING;
    this.startSize = mxConstants.ARROW_SIZE / 5;
    this.endSize = endSize != null ? endSize : mxConstants.ARROW_SIZE / 5;
  }

  /**
   * Allows to use the SVG bounding box in SVG.
   * @defaultValue `false` for performance reasons.
   */
  // useSvgBoundingBox: boolean;
  useSvgBoundingBox = true;

  /**
   * Function: isRoundable
   *
   * Hook for subclassers.
   */
  isRoundable() {
    return true;
  }

  /**
   * Overrides mxShape to reset spacing.
   */
  // resetStyles(): void;
  resetStyles() {
    super.resetStyles();
    this.arrowSpacing = mxConstants.ARROW_SPACING;
  }

  /**
   * Overrides apply to get smooth transition from default start- and endsize.
   */
  // apply(state: mxCellState): void;
  apply(state) {
    super.apply(state);

    if (this.style != null) {
      this.startSize =
        mxUtils.getNumber(
          this.style,
          mxConstants.STYLE_STARTSIZE,
          mxConstants.ARROW_SIZE / 5
        ) * 3;
      this.endSize =
        mxUtils.getNumber(
          this.style,
          mxConstants.STYLE_ENDSIZE,
          mxConstants.ARROW_SIZE / 5
        ) * 3;
    }
  }

  /**
   * Augments the bounding box with the edge width and markers.
   */
  // augmentBoundingBox(bbox: mxRectangle): void;
  augmentBoundingBox(bbox) {
    super.augmentBoundingBox(bbox);

    let w = this.getEdgeWidth();

    if (this.isMarkerStart()) {
      w = Math.max(w, this.getStartArrowWidth());
    }

    if (this.isMarkerEnd()) {
      w = Math.max(w, this.getEndArrowWidth());
    }

    bbox.grow((w / 2 + this.strokewidth) * this.scale);
  }

  /**
   * Paints the line shape.
   */
  // paintEdgeShape(c: mxAbstractCanvas2D, pts: mxPoint[]): void;
  paintEdgeShape(c, pts) {
    // Geometry of arrow
    let strokeWidth = this.strokewidth;

    if (this.outline) {
      strokeWidth = Math.max(
        1,
        mxUtils.getNumber(
          this.style,
          mxConstants.STYLE_STROKEWIDTH,
          this.strokewidth
        )
      );
    }

    const startWidth = this.getStartArrowWidth() + strokeWidth;
    const endWidth = this.getEndArrowWidth() + strokeWidth;
    const edgeWidth = this.outline
      ? this.getEdgeWidth() + strokeWidth
      : this.getEdgeWidth();
    const openEnded = this.isOpenEnded();
    const markerStart = this.isMarkerStart();
    const markerEnd = this.isMarkerEnd();
    const spacing = openEnded ? 0 : this.arrowSpacing + strokeWidth / 2;
    const startSize = this.startSize + strokeWidth;
    const endSize = this.endSize + strokeWidth;
    const isRounded = this.isArrowRounded();

    // Base vector (between first points)
    const pe = pts[pts.length - 1];

    // Finds first non-overlapping point
    let i0 = 1;

    while (
      i0 < pts.length - 1 &&
      pts[i0].x === pts[0].x &&
      pts[i0].y === pts[0].y
    ) {
      i0++;
    }

    const dx = pts[i0].x - pts[0].x;
    const dy = pts[i0].y - pts[0].y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) {
      return;
    }

    // Computes the norm and the inverse norm
    let nx = dx / dist;
    let nx2;
    let nx1 = nx;
    let ny = dy / dist;
    let ny2;
    let ny1 = ny;
    let orthx = edgeWidth * ny;
    let orthy = -edgeWidth * nx;

    // Stores the inbound function calls in reverse order in fns
    const fns = [];

    if (isRounded) {
      c.setLineJoin('round');
    } else if (pts.length > 2) {
      // Only mitre if there are waypoints
      c.setMiterLimit(1.42);
    }

    c.begin();

    const startNx = nx;
    const startNy = ny;

    if (markerStart && !openEnded) {
      this.paintMarker(
        c,
        pts[0].x,
        pts[0].y,
        nx,
        ny,
        startSize,
        startWidth,
        edgeWidth,
        spacing,
        true
      );
    } else {
      const outStartX = pts[0].x + orthx / 2 + spacing * nx;
      const outStartY = pts[0].y + orthy / 2 + spacing * ny;
      const inEndX = pts[0].x - orthx / 2 + spacing * nx;
      const inEndY = pts[0].y - orthy / 2 + spacing * ny;

      if (openEnded) {
        c.moveTo(outStartX, outStartY);

        fns.push(() => {
          c.lineTo(inEndX, inEndY);
        });
      } else {
        c.moveTo(inEndX, inEndY);
        c.lineTo(outStartX, outStartY);
      }
    }

    let dx1 = 0;
    let dy1 = 0;
    let dist1 = 0;

    for (let i = 0; i < pts.length - 2; i += 1) {
      // Work out in which direction the line is bending
      const pos = mxUtils.relativeCcw(
        pts[i].x,
        pts[i].y,
        pts[i + 1].x,
        pts[i + 1].y,
        pts[i + 2].x,
        pts[i + 2].y
      );

      dx1 = pts[i + 2].x - pts[i + 1].x;
      dy1 = pts[i + 2].y - pts[i + 1].y;

      dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

      if (dist1 !== 0) {
        nx1 = dx1 / dist1;
        ny1 = dy1 / dist1;

        const tmp1 = nx * nx1 + ny * ny1;
        const tmp = Math.max(Math.sqrt((tmp1 + 1) / 2), 0.04);

        // Work out the normal orthogonal to the line through the control point and the edge sides intersection
        nx2 = nx + nx1;
        ny2 = ny + ny1;

        const dist2 = Math.sqrt(nx2 * nx2 + ny2 * ny2);

        if (dist2 !== 0) {
          nx2 /= dist2;
          ny2 /= dist2;

          // Higher strokewidths require a larger minimum bend, 0.35 covers all but the most extreme cases
          const strokeWidthFactor = Math.max(
            tmp,
            Math.min(this.strokewidth / 200 + 0.04, 0.35)
          );
          const angleFactor =
            pos !== 0 && isRounded
              ? Math.max(0.1, strokeWidthFactor)
              : Math.max(tmp, 0.06);

          const outX = pts[i + 1].x + (ny2 * edgeWidth) / 2 / angleFactor;
          const outY = pts[i + 1].y - (nx2 * edgeWidth) / 2 / angleFactor;
          const inX = pts[i + 1].x - (ny2 * edgeWidth) / 2 / angleFactor;
          const inY = pts[i + 1].y + (nx2 * edgeWidth) / 2 / angleFactor;

          if (pos === 0 || !isRounded) {
            // If the two segments are aligned, or if we're not drawing curved sections between segments
            // just draw straight to the intersection point
            c.lineTo(outX, outY);

            ((x, y) => {
              fns.push(() => {
                c.lineTo(x, y);
              });
            })(inX, inY);
          } else if (pos === -1) {
            const c1x = inX + ny * edgeWidth;
            const c1y = inY - nx * edgeWidth;
            const c2x = inX + ny1 * edgeWidth;
            const c2y = inY - nx1 * edgeWidth;
            c.lineTo(c1x, c1y);
            c.quadTo(outX, outY, c2x, c2y);

            ((x, y) => {
              fns.push(() => {
                c.lineTo(x, y);
              });
            })(inX, inY);
          } else {
            c.lineTo(outX, outY);

            ((x, y) => {
              const c1x = outX - ny * edgeWidth;
              const c1y = outY + nx * edgeWidth;
              const c2x = outX - ny1 * edgeWidth;
              const c2y = outY + nx1 * edgeWidth;

              fns.push(() => {
                c.quadTo(x, y, c1x, c1y);
              });
              fns.push(() => {
                c.lineTo(c2x, c2y);
              });
            })(inX, inY);
          }

          nx = nx1;
          ny = ny1;
        }
      }
    }

    orthx = edgeWidth * ny1;
    orthy = -edgeWidth * nx1;

    if (markerEnd && !openEnded) {
      this.paintMarker(
        c,
        pe.x,
        pe.y,
        -nx,
        -ny,
        endSize,
        endWidth,
        edgeWidth,
        spacing,
        false
      );
    } else {
      c.lineTo(
        pe.x - spacing * nx1 + orthx / 2,
        pe.y - spacing * ny1 + orthy / 2
      );

      const inStartX = pe.x - spacing * nx1 - orthx / 2;
      const inStartY = pe.y - spacing * ny1 - orthy / 2;

      if (!openEnded) {
        c.lineTo(inStartX, inStartY);
      } else {
        c.moveTo(inStartX, inStartY);

        fns.splice(0, 0, () => {
          c.moveTo(inStartX, inStartY);
        });
      }
    }

    for (let i = fns.length - 1; i >= 0; i--) {
      fns[i]();
    }

    if (openEnded) {
      c.end();
      c.stroke();
    } else {
      c.close();
      c.fillAndStroke();
    }

    // Workaround for shadow on top of base arrow
    c.setShadow(false);

    // Need to redraw the markers without the low miter limit
    c.setMiterLimit(4);

    if (isRounded) {
      c.setLineJoin('flat');
    }

    if (pts.length > 2) {
      // Only to repaint markers if no waypoints
      // Need to redraw the markers without the low miter limit
      c.setMiterLimit(4);
      if (markerStart && !openEnded) {
        c.begin();
        this.paintMarker(
          c,
          pts[0].x,
          pts[0].y,
          startNx,
          startNy,
          startSize,
          startWidth,
          edgeWidth,
          spacing,
          true
        );
        c.stroke();
        c.end();
      }

      if (markerEnd && !openEnded) {
        c.begin();
        this.paintMarker(
          c,
          pe.x,
          pe.y,
          -nx,
          -ny,
          endSize,
          endWidth,
          edgeWidth,
          spacing,
          true
        );
        c.stroke();
        c.end();
      }
    }
  }

  /**
   * Function: paintMarker
   *
   * Paints the marker.
   */
  paintMarker(
    c,
    ptX,
    ptY,
    nx,
    ny,
    size,
    arrowWidth,
    edgeWidth,
    spacing,
    initialMove
  ) {
    const widthArrowRatio = edgeWidth / arrowWidth;
    const orthx = (edgeWidth * ny) / 2;
    const orthy = (-edgeWidth * nx) / 2;

    const spaceX = (spacing + size) * nx;
    const spaceY = (spacing + size) * ny;

    if (initialMove) {
      c.moveTo(ptX - orthx + spaceX, ptY - orthy + spaceY);
    } else {
      c.lineTo(ptX - orthx + spaceX, ptY - orthy + spaceY);
    }

    c.lineTo(
      ptX - orthx / widthArrowRatio + spaceX,
      ptY - orthy / widthArrowRatio + spaceY
    );
    c.lineTo(ptX + spacing * nx, ptY + spacing * ny);
    c.lineTo(
      ptX + orthx / widthArrowRatio + spaceX,
      ptY + orthy / widthArrowRatio + spaceY
    );
    c.lineTo(ptX + orthx + spaceX, ptY + orthy + spaceY);
  }

  /**
   * @returns whether the arrow is rounded
   */
  // isArrowRounded(): boolean;
  isArrowRounded() {
    return this.isRounded;
  }

  /**
   * @returns the width of the start arrow
   */
  // getStartArrowWidth(): number;
  getStartArrowWidth() {
    return mxConstants.ARROW_WIDTH;
  }

  /**
   * @returns the width of the end arrow
   */
  // getEndArrowWidth(): number;
  getEndArrowWidth() {
    return mxConstants.ARROW_WIDTH;
  }

  /**
   * @returns the width of the body of the edge
   */
  // getEdgeWidth(): number;
  getEdgeWidth() {
    return mxConstants.ARROW_WIDTH / 3;
  }

  /**
   * @returns whether the ends of the shape are drawn
   */
  // isOpenEnded(): boolean;
  isOpenEnded() {
    return false;
  }

  /**
   * @returns whether the start marker is drawn
   */
  // isMarkerStart(): boolean;
  isMarkerStart() {
    return (
      mxUtils.getValue(
        this.style,
        mxConstants.STYLE_STARTARROW,
        mxConstants.NONE
      ) !== mxConstants.NONE
    );
  }

  /**
   * @returns whether the end marker is drawn
   */
  // isMarkerEnd(): boolean;
  isMarkerEnd() {
    return (
      mxUtils.getValue(
        this.style,
        mxConstants.STYLE_ENDARROW,
        mxConstants.NONE
      ) !== mxConstants.NONE
    );
  }
}

export default mxArrowConnector;