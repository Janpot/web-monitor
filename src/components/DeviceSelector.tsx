import { FormControlLabel, RadioGroup, Radio } from '@material-ui/core';
import * as React from 'react';
import { DeviceSelection } from '../types';

export interface DeviceSelectorProps {
  className?: string;
  value: DeviceSelection;
  onChange(newValue: DeviceSelection): void;
}

const RADIOS: {
  value: DeviceSelection;
  title: string;
}[] = [
  { value: 'mobile', title: 'Mobile' },
  { value: 'desktop', title: 'Desktop' },
  { value: 'all', title: 'All' },
];

export default function DeviceSelector({
  className,
  value,
  onChange,
}: DeviceSelectorProps) {
  const radios = RADIOS.map(({ value, title }, i) => (
    <FormControlLabel
      className={className}
      key={i}
      value={value}
      control={<Radio />}
      label={title}
    />
  ));
  return (
    <RadioGroup
      row
      value={value}
      onChange={(e) => onChange(e.target.value as DeviceSelection)}
    >
      {radios}
    </RadioGroup>
  );
}
