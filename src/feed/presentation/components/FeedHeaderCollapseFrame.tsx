import React from 'react';

type FeedHeaderCollapseFrameProps = {
  children: React.ReactNode;
  hidden?: boolean;
};

export function FeedHeaderCollapseFrame({
  children,
}: FeedHeaderCollapseFrameProps) {
  return <>{children}</>;
}

export default FeedHeaderCollapseFrame;
