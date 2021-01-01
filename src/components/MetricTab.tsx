import { makeStyles, createStyles, Typography } from '@material-ui/core';
import clsx from 'clsx';
import React from 'react';
import { PaperTab } from './PaperTabs';
import ErrorIcon from '@material-ui/icons/ErrorOutline';

const useStyles = makeStyles((theme) =>
  createStyles({
    toolbarControl: {
      marginRight: theme.spacing(2),
    },
    bad: {},
    good: {},
    webVitalTab: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: theme.spacing(2),
    },
    metricValue: {
      fontSize: 24,
      '$bad &': {
        color: theme.palette.error.main,
      },
      '$good &': {
        color: theme.palette.success.main,
      },
    },
  })
);

export interface MetricTabProps {
  title: string;
  value?: string | null;
  severity?: 'error' | 'success' | null;
  active: boolean;
  onClick: () => void;
}

export default function MetricTab({
  title,
  value,
  active,
  onClick,
  severity,
}: MetricTabProps) {
  const classes = useStyles();
  return (
    <PaperTab
      className={clsx(classes.webVitalTab, {
        [classes.bad]: severity === 'error',
        [classes.good]: severity === 'success',
      })}
      onClick={onClick}
      active={active}
    >
      <Typography align="center" variant="caption">
        {title}
      </Typography>
      <Typography className={classes.metricValue}>
        {value === null ? '-' : value}
      </Typography>
    </PaperTab>
  );
}
