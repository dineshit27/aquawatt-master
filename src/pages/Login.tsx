import React from 'react';
import { SplitAuthPage } from '../components/auth/SplitAuthPage';
import { Seo } from '../components/common/Seo';

export const Login: React.FC = () => (
  <>
    <Seo title="Sign in — AquaWatt" description="Sign in to the AquaWatt console." noindex />
    <SplitAuthPage mode="login" />
  </>
);
