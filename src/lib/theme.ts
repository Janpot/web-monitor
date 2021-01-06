import { createMuiTheme } from '@material-ui/core/styles';
import { red, grey, cyan } from '@material-ui/core/colors';
import { buildChartTheme, XYChartTheme } from '@visx/xychart';

declare module '@material-ui/core' {
  interface Theme {
    visx: XYChartTheme;
  }
}

// Create a theme instance.
const theme = createMuiTheme({
  palette: {
    type: 'dark',
    primary: {
      main: '#556cd6',
    },
    secondary: {
      main: '#19857b',
    },
    error: {
      main: red.A400,
    },
    background: {
      //default: '#fff',
    },
  },
});

theme.visx = buildChartTheme({
  backgroundColor: '#222',
  colors: [cyan[400]],
  tickLength: 4,
  svgLabelSmall: {
    fill: grey[100],
    fontWeight: 'normal',
  },
  svgLabelBig: {
    fill: grey[100],
    fontWeight: 'normal',
  },
  gridColor: grey[700],
  gridColorDark: grey[100],
});

export default theme;
