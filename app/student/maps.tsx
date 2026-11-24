import { useCallback, useState } from 'react';

import { useFocusEffect } from 'expo-router';

import LaboratoryMapsView from '../../src/features/maps/components/LaboratoryMapsView';

const StudentMapsScreen = () => {
  const [isFocused, setIsFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);

      return () => {
        setIsFocused(false);
      };
    }, [])
  );

  return <LaboratoryMapsView active={isFocused} />;
};

export default StudentMapsScreen;
