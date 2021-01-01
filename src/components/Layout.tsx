import * as React from 'react';
import { signIn, signOut, useSession } from 'next-auth/client';
import {
  Avatar,
  Box,
  Button,
  Container,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  CircularProgress,
  Tab,
  Tabs,
} from '@material-ui/core';
import Link, { Anchor } from './Link';
import { Property } from '../types';

export interface LayoutProps {
  activeTab?: 'visitors' | 'webVitals';
  property?: Property;
  children?: React.ReactNode;
}

export default function Layout({ property, children, activeTab }: LayoutProps) {
  const [session, loading] = useSession();

  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

  const isMenuOpen = Boolean(anchorEl);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOutClick = async () => {
    await signOut();
    handleMenuClose();
  };

  return (
    <>
      <Container>
        <Toolbar disableGutters>
          {property && (
            <>
              <Tabs value={activeTab}>
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
            </>
          )}
          <Box flex={1} />
          <Link href="/">
            <Typography variant="h6">Web Monitor</Typography>
          </Link>
          <Box flex={1} />
          {session ? (
            <>
              <Menu
                anchorEl={anchorEl}
                keepMounted
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                getContentAnchorEl={null}
                open={isMenuOpen}
                onClose={handleMenuClose}
              >
                <MenuItem onClick={handleSignOutClick}>Sign out</MenuItem>
              </Menu>
              <IconButton onClick={handleMenuOpen} edge="end" size="small">
                <Avatar
                  alt={session.user.name || session.user.email || ''}
                  src={session.user.image || undefined}
                />
              </IconButton>
            </>
          ) : loading ? (
            <CircularProgress size={24} />
          ) : (
            <Button variant="outlined" onClick={() => signIn()}>
              Sign in
            </Button>
          )}
        </Toolbar>
      </Container>
      {session && children}
    </>
  );
}
