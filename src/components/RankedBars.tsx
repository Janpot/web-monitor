import { useTheme } from '@material-ui/core';
import {
  Annotation,
  AnnotationLabel,
  Axis,
  BarSeries,
  XYChart,
} from '@visx/xychart';
import * as React from 'react';

interface RankedBarsProps {
  data: { label: React.ReactNode; value: number }[];
  formatValue?: (value: number) => string;
}

export default function RankedBars({
  data,
  formatValue = String,
}: RankedBarsProps) {
  const theme = useTheme();
  const labelWidth = 100;
  return (
    <div>
      <XYChart
        margin={{ top: 0, left: labelWidth, bottom: 0, right: 0 }}
        xScale={{ type: 'linear', zero: true, nice: true }}
        yScale={{ type: 'band', reverse: true, padding: 0.1 }}
        theme={theme.visx}
        height={400}
      >
        <Axis
          orientation="left"
          hideTicks
          hideAxisLine
          tickLabelProps={() => ({ width: labelWidth })}
        />
        <BarSeries
          dataKey="data"
          data={data}
          xAccessor={(d) => d.value}
          yAccessor={(d) => d.label}
        />
        {data.map((d, i) => (
          <Annotation key={i} dataKey="data" datum={d} dx={20} dy={0}>
            <AnnotationLabel
              subtitle={formatValue(d.value)}
              horizontalAnchor="middle"
              verticalAnchor="middle"
              showBackground={false}
              showAnchorLine={false}
              width={50}
            />
          </Annotation>
        ))}
      </XYChart>
    </div>
  );
}
