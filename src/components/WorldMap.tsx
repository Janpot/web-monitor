import topology from 'world-atlas/countries-110m.json';
import * as topojson from 'topojson-client';
import * as React from 'react';
import { Mercator } from '@visx/geo';
import { ParentSize } from '@visx/responsive';
import { scaleLinear, PickD3Scale } from '@visx/scale';
import { Tooltip, useTheme } from '@material-ui/core';

interface FeatureShape {
  type: 'Feature';
  id: string;
  geometry: { coordinates: [number, number][][]; type: 'Polygon' };
  properties: { name: string };
}

// @ts-ignore
const world = topojson.feature(topology, topology.objects.countries) as {
  type: 'FeatureCollection';
  features: FeatureShape[];
};

const numberFormatPercent = new Intl.NumberFormat('en', {
  style: 'percent',
  maximumFractionDigits: 2,
});

interface CountryProps {
  path: string;
  color: PickD3Scale<'linear', string>;
  value?: number;
  name: string;
}

function Country({ path, color, value, name }: CountryProps) {
  const theme = useTheme();

  const [hover, setHover] = React.useState(false);

  const positionRef = React.useRef({ x: 0, y: 0 });
  const popperRef = React.useRef<any>(null);

  const handleMouseMove = (event: React.MouseEvent) => {
    positionRef.current = { x: event.clientX, y: event.clientY };

    if (popperRef.current) {
      popperRef.current.scheduleUpdate();
    }
  };

  const handleMouseEnter = () => setHover(true);
  const handleMouseLeave = () => setHover(false);

  return (
    <Tooltip
      title={`${name}: ${value ? numberFormatPercent.format(value) : '-'}`}
      placement="top"
      arrow
      onMouseMove={handleMouseMove}
      PopperProps={{
        popperRef,
        anchorEl: {
          clientHeight: 0,
          clientWidth: 0,
          getBoundingClientRect: () => ({
            top: positionRef.current.y,
            left: positionRef.current.x,
            right: positionRef.current.x,
            bottom: positionRef.current.y,
            width: 0,
            height: 0,
          }),
        },
      }}
    >
      <path
        d={path}
        fill={color(value || 0)}
        stroke={theme.palette.background.paper}
        strokeWidth={0.5}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        opacity={hover ? 0.8 : 1}
      />
    </Tooltip>
  );
}

interface WorldMapContentProps {
  width: number;
  height: number;
  values: {
    [numericCode: string]: number;
  };
}

function WorldMapContent({ values, width, height }: WorldMapContentProps) {
  const theme = useTheme();

  const color = React.useMemo(() => {
    const valueArray = Object.values(values);
    return scaleLinear({
      domain:
        valueArray.length > 0
          ? [Math.min(...valueArray), Math.max(...valueArray)]
          : [0, 1],
      range: [theme.palette.secondary.light, theme.palette.secondary.dark],
    });
  }, [values]);

  return (
    <svg width={width} height={height}>
      <Mercator
        data={world.features}
        fitExtent={[
          [
            [0, 0],
            [width, 1.35 * height],
          ],
          world,
        ]}
      >
        {(mercator) => (
          <g>
            {mercator.features.map(({ feature, path }, i) => (
              <Country
                name={feature.properties.name}
                key={feature.id}
                path={path || ''}
                value={values[feature.id]}
                color={color}
              />
            ))}
          </g>
        )}
      </Mercator>
    </svg>
  );
}

interface WorldMapProps {
  values: {
    [numericCode: string]: number;
  };
}

export default function WorldMap(props: WorldMapProps) {
  return (
    <ParentSize>
      {(parent) => (
        <WorldMapContent
          width={parent.width}
          height={parent.height}
          {...props}
        />
      )}
    </ParentSize>
  );
}
