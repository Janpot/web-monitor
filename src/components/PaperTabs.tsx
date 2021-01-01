import { makeStyles } from '@material-ui/core';
import createStyles from '@material-ui/core/styles/createStyles';
import clsx from 'clsx';

const useStyles = makeStyles((theme) =>
  createStyles({
    active: {},
    paperTab: {
      flex: 1,
      cursor: 'pointer',
      '&$active': {
        borderRadius: [
          [theme.shape.borderRadius, theme.shape.borderRadius, 0, 0],
        ],
        background: theme.palette.background.paper,
        boxShadow: theme.shadows[4],
        clipPath: `inset(-5px -5px 0px -5px)`,
        cursor: 'unset',
      },
    },
    paperTabs: {
      display: 'flex',
      flexDirection: 'row',
    },
    paperTabContent: {
      padding: theme.spacing(5, 2, 2, 2),
      background: theme.palette.background.paper,
      borderRadius: theme.shape.borderRadius,
      boxShadow: theme.shadows[4],
    },
  })
);

export interface PaperTabProps {
  className?: string;
  active: boolean;
  children?: React.ReactNode;
  onClick: () => void;
}

export function PaperTab({
  children,
  active,
  onClick,
  className,
}: PaperTabProps) {
  const classes = useStyles();
  return (
    <div
      onClick={onClick}
      className={clsx(className, classes.paperTab, {
        [classes.active]: active,
      })}
    >
      {children}
    </div>
  );
}

export interface PaperTabsProps {
  children?: React.ReactNode;
}

export function PaperTabs({ children }: PaperTabsProps) {
  const classes = useStyles();
  return <div className={classes.paperTabs}>{children}</div>;
}

export interface PaperTabContentProps {
  children?: React.ReactNode;
}

export function PaperTabContent({ children }: PaperTabContentProps) {
  const classes = useStyles();
  return <div className={classes.paperTabContent}>{children}</div>;
}
