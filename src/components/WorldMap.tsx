import topology from 'world-atlas/countries-110m.json';
import * as topojson from 'topojson-client';
import * as React from 'react';
import { Mercator } from '@visx/geo';
import { ParentSize } from '@visx/responsive';
import { scaleLinear } from '@visx/scale';
import {
  lighten,
  Tooltip,
  useTheme,
  TooltipProps,
  makeStyles,
} from '@material-ui/core';
import ChartTooltipContent from './ChartTooltipContent';

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

interface ExtendedTooltipProps extends TooltipProps {
  // will be part of matui v5:
  followCursor?: boolean;
}

const ExtendedTooltip = React.forwardRef<typeof Tooltip, ExtendedTooltipProps>(
  ({ followCursor, ...props }: ExtendedTooltipProps) => {
    const positionRef = React.useRef({ x: 0, y: 0 });
    const popperRef = React.useRef<any>(null);

    const handleMouseMove = (event: React.MouseEvent) => {
      positionRef.current = { x: event.clientX, y: event.clientY };

      if (popperRef.current) {
        popperRef.current.scheduleUpdate();
      }
    };

    const extendedTooltipProps = followCursor
      ? {
          onMouseMove: handleMouseMove,
          PopperProps: {
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
          },
        }
      : {};

    return <Tooltip {...props} {...extendedTooltipProps} />;
  }
);

const useTooltipStyles = makeStyles((theme) => ({
  tooltip: {
    boxShadow: theme.shadows[1],
  },
}));

const numberFormat = new Intl.NumberFormat('en', {
  maximumFractionDigits: 2,
});

interface CountryProps {
  path: string;
  color: string;
  tooltip: React.ReactElement | string;
}

function Country({ path, color, tooltip }: CountryProps) {
  const theme = useTheme();

  const [hover, setHover] = React.useState(false);
  const handleMouseEnter = () => setHover(true);
  const handleMouseLeave = () => setHover(false);

  const tooltipClasses = useTooltipStyles();

  return (
    <ExtendedTooltip
      classes={tooltipClasses}
      title={tooltip}
      placement="top"
      arrow
      followCursor
    >
      <path
        d={path}
        fill={hover ? lighten(color, 0.1) : color}
        stroke={theme.palette.background.paper}
        strokeWidth={0.5}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
    </ExtendedTooltip>
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
        // https://stackoverflow.com/a/54738220/419436
        fitSize={[
          [width, height],
          {
            type: 'Polygon',
            coordinates: [
              [
                [-179.999, 84],
                [-179.999, -57],
                [179.999, -57],
                [179.999, 84],
                [-179.999, 84],
              ],
            ],
          },
        ]}
      >
        {(mercator) =>
          mercator.features.map(({ feature, path }, i) => {
            const { name } = feature.properties;
            const value = values[feature.id];
            const countryColor =
              typeof value === 'number'
                ? color(value)
                : theme.palette.grey[600];
            return (
              <Country
                key={feature.id}
                tooltip={
                  <ChartTooltipContent
                    title={name}
                    data={[{ label: 'Pageviews', value }]}
                    formatValue={numberFormat.format}
                  />
                }
                path={path || ''}
                color={countryColor}
              />
            );
          })
        }
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
