import { Typography } from '@material-ui/core';
import React from 'react';

interface ChartTooltipContent<D> {
  title: string;
  data: { label: string; value?: D | null }[];
  formatValue?: (value: D) => React.ReactNode;
}

export default function ChartTooltipContent<D>({
  title,
  data,
  formatValue = String,
}: ChartTooltipContent<D>) {
  return (
    <>
      <Typography variant="h6">{title}</Typography>
      {data.map(({ label, value }) => (
        <Typography variant="body2">
          {label}:{' '}
          {value !== null && value !== undefined ? formatValue(value) : '-'}
        </Typography>
      ))}
    </>
  );
}
