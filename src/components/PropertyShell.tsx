import { Tabs, Tab, Typography } from '@material-ui/core';
import { Skeleton } from '@material-ui/lab';
import * as React from 'react';
import { Property } from '../types';
import { Anchor } from './Link';

export interface PropertyShellProps {
  active: 'visitors' | 'webVitals';
  property?: Property;
  children?: React.ReactNode;
}

export default function PropertyShell({
  property,
  children,
  active,
}: PropertyShellProps) {
  return (
    <>
      <Typography variant="h2">
        {property ? property.name : <Skeleton width={260} />}
      </Typography>
      <Tabs value={active}>
        <Tab
          value="visitors"
          component={Anchor}
          disabled={!property}
          href={property ? `/property/${property.id}/visitors` : '/'}
          label="Visitors"
        />
        <Tab
          value="webVitals"
          component={Anchor}
          disabled={!property}
          href={property ? `/property/${property.id}/web-vitals` : '/'}
          label="Web Vitals"
        />
      </Tabs>
      {children}
    </>
  );
}
