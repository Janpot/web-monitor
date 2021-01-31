import { AvatarProps, Avatar } from '@material-ui/core';
import * as React from 'react';

interface FaviconAvatarProps extends AvatarProps {
  url: string;
}

export default function FaviconAvatar(props: FaviconAvatarProps) {
  const { url, ...rest } = props;
  const [src, setSrc] = React.useState<string | undefined>(
    `https://www.google.com/s2/favicons?sz=48&domain_url=${encodeURIComponent(
      url
    )}`
  );

  const handleLoad = (event: React.SyntheticEvent<HTMLDivElement>) => {
    if ((event.target as HTMLImageElement).naturalWidth < 48) {
      setSrc(undefined);
    }
  };

  return (
    <Avatar
      variant="square"
      alt={`Favicon for ${url}`}
      src={src}
      onLoad={handleLoad}
      {...rest}
    >
      {url.slice(0, 1)}
    </Avatar>
  );
}
