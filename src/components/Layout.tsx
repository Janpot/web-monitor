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
  CircularProgress,
  Tab,
  Tabs,
} from '@material-ui/core';
import { Anchor } from './Link';
import { Property } from '../types';
import HomeIcon from '@material-ui/icons/Home';

export interface LayoutProps {
  activeTab?: 'audience' | 'webVitals';
  property?: Property | null;
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
          <Box
            display="flex"
            flexGrow={1}
            flexBasis={0}
            justifyContent="flex-start"
          >
            {activeTab && (
              <Tabs value={activeTab}>
                <Tab
                  value="audience"
                  disabled={!property}
                  component={Anchor}
                  href={property ? `/property/${property.id}/audience` : '/'}
                  label="Audience"
                />
                <Tab
                  value="webVitals"
                  disabled={!property}
                  component={Anchor}
                  href={property ? `/property/${property.id}/web-vitals` : '/'}
                  label="Web Vitals"
                />
              </Tabs>
            )}
          </Box>
          <Box
            display="flex"
            flexGrow={1}
            flexBasis={0}
            justifyContent="center"
          >
            <IconButton component={Anchor} href="/">
              <HomeIcon />
            </IconButton>
          </Box>
          <Box
            display="flex"
            flexGrow={1}
            flexBasis={0}
            justifyContent="flex-end"
          >
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
          </Box>
        </Toolbar>
      </Container>
      {session && children}
    </>
  );
}
