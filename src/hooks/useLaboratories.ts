import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useApp } from '../context/AppContext';

import {
  createLaboratory as createLaboratoryService,
  deleteLaboratory as deleteLaboratoryService,
  subscribeLaboratories,
  updateLaboratory as updateLaboratoryService,
} from '../services/laboratoryService';

import type {
  ApiResponse,
  CreateLaboratoryInput,
  Laboratory,
  UseLaboratoriesResult,
} from '../types/models';

interface LaboratorySnapshot {
  userId: string;
  items: Laboratory[];
  loaded: boolean;
}

export const useLaboratories = (): UseLaboratoriesResult => {
  const { currentUser, reportError } = useApp();

  const [snapshot, setSnapshot] =
    useState<LaboratorySnapshot>({
      userId: '',
      items: [],
      loaded: false,
    });

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const userId = currentUser.uid;

    const unsubscribe = subscribeLaboratories(
      (items) => {
        setSnapshot({
          userId,
          items,
          loaded: true,
        });
      },
      (message) => {
        setSnapshot((previous) => ({
          userId,
          items:
            previous.userId === userId
              ? previous.items
              : [],
          loaded: true,
        }));

        reportError('firestore', message);
      }
    );

    return unsubscribe;
  }, [currentUser, reportError]);

  const laboratories = useMemo(
    () =>
      currentUser && snapshot.userId === currentUser.uid
        ? snapshot.items
        : [],
    [currentUser, snapshot]
  );

  const loading =
    currentUser != null &&
    (snapshot.userId !== currentUser.uid ||
      !snapshot.loaded);

  const runAction = useCallback(
    async <T,>(
      action: Promise<ApiResponse<T>>
    ): Promise<ApiResponse<T>> => {
      const result = await action;

      if (!result.ok) {
        reportError('firestore', result.message);
      }

      return result;
    },
    [reportError]
  );

  const createLaboratory = useCallback(
    (input: CreateLaboratoryInput) =>
      runAction(createLaboratoryService(input, currentUser)),
    [currentUser, runAction]
  );

  const updateLaboratory = useCallback(
    (
      laboratoryId: string,
      patch: Partial<CreateLaboratoryInput>
    ) =>
      runAction(
        updateLaboratoryService(
          laboratoryId,
          patch,
          currentUser
        )
      ),
    [currentUser, runAction]
  );

  const deleteLaboratory = useCallback(
    (laboratoryId: string) =>
      runAction(
        deleteLaboratoryService(laboratoryId, currentUser)
      ),
    [currentUser, runAction]
  );

  return useMemo(
    () => ({
      laboratories,
      loading,
      createLaboratory,
      updateLaboratory,
      deleteLaboratory,
    }),
    [
      laboratories,
      loading,
      createLaboratory,
      updateLaboratory,
      deleteLaboratory,
    ]
  );
};
