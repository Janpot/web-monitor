import { Typography, Toolbar, Box } from '@material-ui/core';
import { Skeleton } from '@material-ui/lab';
import * as React from 'react';
import { Property } from '../types';

export interface PropertyToolbarProps {
  property?: Property | null;
  children?: React.ReactNode;
}

export default function PropertyToolbar({
  property,
  children,
}: PropertyToolbarProps) {
  return (
    <Box mt={3} mb={6}>
      <Toolbar disableGutters>
        <Typography variant="h2" noWrap>
          {property ? property.name : <Skeleton width={260} />}
        </Typography>
        <Box flex={1} />
        {children}
      </Toolbar>
    </Box>
  );
}
