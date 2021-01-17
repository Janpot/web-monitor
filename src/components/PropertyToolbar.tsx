import { Typography, Toolbar, Box, makeStyles } from '@material-ui/core';
import { Skeleton } from '@material-ui/lab';
import * as React from 'react';
import { Property } from '../types';

const useStyles = makeStyles((theme) => ({
  tools: {
    display: 'flex',
    flexDirection: 'row',
    '& > *': {
      marginLeft: theme.spacing(2),
    },
  },
}));

export interface PropertyToolbarProps {
  property?: Property | null;
  children?: React.ReactNode;
}

export default function PropertyToolbar({
  property,
  children,
}: PropertyToolbarProps) {
  const classes = useStyles();
  return (
    <Box mt={3} mb={6}>
      <Toolbar disableGutters>
        <Typography variant="h2" noWrap>
          {property ? property.name : <Skeleton width={260} />}
        </Typography>
        <Box flex={1} />
        <div className={classes.tools}>{children}</div>
      </Toolbar>
    </Box>
  );
}
