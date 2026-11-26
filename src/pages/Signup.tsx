import React from 'react';
import { SplitAuthPage } from '../components/auth/SplitAuthPage';
import { Seo } from '../components/common/Seo';

export const Signup: React.FC = () => (
  <>
    <Seo title="Create account — AquaWatt" description="Create an AquaWatt facility account." noindex />
    <SplitAuthPage mode="signup" />
  </>
);
