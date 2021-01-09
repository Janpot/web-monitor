import * as React from 'react';
import { useTheme, Tooltip as MuiTooltip } from '@material-ui/core';
import {
  Axis,
  LineSeries,
  XYChart,
  DataContext,
  Grid as ChartGrid,
  Tooltip as VisxTooltip,
} from '@visx/xychart';
import { curveMonotoneX } from '@visx/curve';
import { Line } from '@visx/shape';
import ChartTooltipContent from './ChartTooltipContent';

interface Datum {
  timestamp: number;
  value: number | null;
}

interface LineChartProps<D extends Datum> {
  data: D[];
  width: number;
  height: number;
  target: number;
  label: string;
  valueFormat: (value: number) => string;
  dateFormat: (value: number) => string;
  unit?: string;
}

interface ReferenceLineProps {
  value: number;
  label?: string;
}

function ReferenceLine2({ value, label }: ReferenceLineProps) {
  const { yScale, margin, innerWidth } = React.useContext(DataContext);
  const matuiTheme = useTheme();
  const y = yScale?.(value) ?? 0;
  const color = matuiTheme.palette.error.main;
  return (
    <>
      <Line
        x1={margin?.left ?? 0}
        x2={(margin?.left ?? 0) + (innerWidth ?? 0)}
        y1={y as number}
        y2={y as number}
        stroke={color}
        strokeDasharray="3 3"
        strokeWidth={2}
      />
    </>
  );
}

interface TooltipGlyphProps {
  radius: number;
  color?: string;
}

const TooltipGlyph = React.forwardRef<SVGSVGElement, TooltipGlyphProps>(
  ({ radius, color }, ref) => {
    const muiTheme = useTheme();
    return (
      <svg
        width={radius * 2}
        height={radius * 2}
        style={{
          position: 'absolute',
          pointerEvents: 'none',
        }}
        ref={ref}
      >
        <circle r={radius} cx={radius} cy={radius} fill={color} opacity="0.3" />
        <circle
          r={radius / 2}
          cx={radius}
          cy={radius}
          stroke={color}
          fill={muiTheme.palette.background.paper}
          strokeWidth={2}
        />
      </svg>
    );
  }
);

export default function LineChart<D extends Datum>({
  data,
  label,
  valueFormat,
  dateFormat,
  unit,
  height,
  target,
}: LineChartProps<D>) {
  const muiTheme = useTheme();
  const numTicks = 5;

  return (
    <div>
      <XYChart
        margin={{ top: 50, right: 20, bottom: 50, left: 50 }}
        xScale={{ type: 'time' }}
        yScale={{ type: 'linear', zero: true, nice: true }}
        height={height}
        theme={muiTheme.visx}
      >
        <ChartGrid columns={false} numTicks={numTicks} />
        <Axis
          orientation="left"
          label={label}
          tickFormat={valueFormat}
          hideAxisLine
          hideTicks
          numTicks={numTicks}
        />
        <Axis orientation="bottom" />
        <ReferenceLine2 value={target} />
        <LineSeries
          dataKey={label}
          data={data}
          xAccessor={(d) => d.timestamp}
          yAccessor={(d) => d.value}
          curve={curveMonotoneX}
        />
        <VisxTooltip<Datum>
          showVerticalCrosshair
          snapTooltipToDatumX
          snapTooltipToDatumY
          verticalCrosshairStyle={{
            strokeDasharray: '3 3',
            strokeWidth: 2,
          }}
          unstyled
          applyPositionStyle
          offsetLeft={-12}
          offsetTop={12}
          renderTooltip={({ tooltipData, colorScale }) => {
            const nearestDatum = tooltipData?.nearestDatum;
            if (!nearestDatum) return null;
            return (
              <MuiTooltip
                open
                title={
                  <ChartTooltipContent
                    title={dateFormat(nearestDatum.datum?.timestamp)}
                    data={[{ label, value: nearestDatum.datum?.value }]}
                    formatValue={(value) =>
                      `${valueFormat(value)} ${unit || ''}`
                    }
                  />
                }
                placement="top"
                arrow
              >
                <TooltipGlyph
                  radius={12}
                  color={colorScale?.(nearestDatum.key)}
                />
              </MuiTooltip>
            );
          }}
        />
      </XYChart>
    </div>
  );
}
