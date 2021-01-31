import useSWR from 'swr';
import * as React from 'react';
import Link from './Link';
import { getProperties } from '../pages/api/data';
import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Fab,
  makeStyles,
  Dialog,
  DialogTitle,
  Button,
  DialogActions,
  DialogContent,
  DialogContentText,
  TextField,
} from '@material-ui/core';
import { Property } from '../types';
import FaviconAvatar from './FaviconAvatar';
import AddIcon from '@material-ui/icons/Add';

const useStyles = makeStyles((theme) => ({
  root: {
    marginTop: theme.spacing(3),
    position: 'relative',
  },
  fab: {
    position: 'absolute',
    top: -theme.spacing(3),
    right: theme.spacing(2),
  },
}));

interface NewPropertyDialogProps {
  open: boolean;
  onClose?: () => void;
}

function NewPropertyDialog({ open, onClose }: NewPropertyDialogProps) {
  const [name, setName] = React.useState('');
  const handleClose = () => onClose?.();
  const handleCreate = () => {
    alert('TODO');
    handleClose();
  };
  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Create Property</DialogTitle>
      <DialogContent>
        <DialogContentText>
          To create a new property, supply a name
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          label="Property Name"
          fullWidth
          onChange={(event) => setName(event.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          Cancel
        </Button>
        <Button onClick={handleCreate} color="primary" disabled={!name}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface PropertiesListProps {
  properties: Property[];
}

function PropertiesList({ properties }: PropertiesListProps) {
  const [newPropertyFialogOpen, setNewProperttDialogOpen] = React.useState(
    false
  );
  const classes = useStyles();
  return (
    <div className={classes.root}>
      <List component={Paper}>
        {properties.map((property) => (
          <ListItem
            key={property.id}
            button
            component={Link}
            href={`/property/${property.id}/audience`}
          >
            <ListItemAvatar>
              <FaviconAvatar url={property.name} />
            </ListItemAvatar>
            <ListItemText primary={property.name} secondary={property.id} />
          </ListItem>
        ))}
      </List>
      <Fab
        className={classes.fab}
        onClick={() => setNewProperttDialogOpen(true)}
      >
        <AddIcon />
      </Fab>
      <NewPropertyDialog
        open={newPropertyFialogOpen}
        onClose={() => setNewProperttDialogOpen(false)}
      />
    </div>
  );
}

export default function Properties() {
  const { data: properties } = useSWR('anything', getProperties);
  return properties ? <PropertiesList properties={properties} /> : null;
}
