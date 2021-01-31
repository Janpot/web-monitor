import { createMuiTheme } from '@material-ui/core/styles';
import { grey, cyan, blue, pink, deepOrange } from '@material-ui/core/colors';
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
      main: blue[200],
    },
    secondary: {
      main: pink[200],
    },
    error: {
      main: deepOrange.A400,
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
