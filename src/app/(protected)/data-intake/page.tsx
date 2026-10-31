'use client'

import { DataIntakeContainer } from './_components/data-intake-container'
import { VariableList } from './_components/variable-list'
import { EmptyState } from './_components/state-display'
import { ReactNode } from 'react'

export default function DataIntake(): ReactNode {
  return (
    <DataIntakeContainer>
      {(props) => {
        const { filteredVariables, handleDeleteClick, handleOpenDetailsModal } = props;

        if (filteredVariables.length === 0) {
          return (
            <EmptyState
              message="No variables found for the selected organization. Upload a CSV file or create a variable to get started."
            />
          );
        }

        return (
          <VariableList
            variables={filteredVariables}
            onDelete={handleDeleteClick}
            onViewDetails={handleOpenDetailsModal}
          />
        );
      }}
    </DataIntakeContainer>
  );
}
