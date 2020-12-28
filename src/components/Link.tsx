import * as React from 'react';
import NextLink, { LinkProps as NextLinkProps } from 'next/link';
import MuiLink, { LinkProps as MuiLinkProps } from '@material-ui/core/Link';

export type AnchorProps = Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
> &
  NextLinkProps;

// an <a> wrapped by a next/link. Intended to be composed in a @material-ui/core/Link
export const Anchor = React.forwardRef<HTMLAnchorElement, AnchorProps>(
  (props: AnchorProps, ref) => {
    const {
      as,
      href,
      replace,
      scroll,
      passHref,
      shallow,
      prefetch,
      ...other
    } = props;

    return (
      <NextLink
        href={href}
        prefetch={prefetch}
        as={as}
        replace={replace}
        scroll={scroll}
        shallow={shallow}
        passHref={passHref}
      >
        <a ref={ref} {...other} />
      </NextLink>
    );
  }
);

interface LinkPropsBase {
  innerRef?: React.Ref<HTMLAnchorElement>;
}

export type LinkProps = LinkPropsBase &
  AnchorProps &
  Omit<MuiLinkProps, 'href'>;

// A styled version of the Next.js Link component:
// https://nextjs.org/docs/#with-link
function Link(props: LinkProps) {
  const { href, innerRef, ...other } = props;

  return (
    <MuiLink
      component={Anchor}
      ref={innerRef}
      href={href as string}
      {...other}
    />
  );
}

export default React.forwardRef<HTMLAnchorElement, LinkProps>((props, ref) => (
  <Link {...props} innerRef={ref} />
));
