'use client'

import { DataIntakeContainer } from './_components/data-intake-container'
import { VariableCard } from './_components/variable-card'
import { VariableDetailsModal } from './_components/variable-details-modal'
import { EmptyState } from './_components/state-display'
import { ReactNode } from 'react'

// Add debugging at the top of the page component
console.log('🔍 DATA-INTAKE PAGE ENV CHECK:', {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL,
  hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasBackendUrl: !!process.env.NEXT_PUBLIC_BACKEND_URL,
  processEnvKeys: typeof process !== 'undefined' ? Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')) : 'no process'
});

export default function DataIntake(): ReactNode {
  console.log('📊 DATA-INTAKE PAGE REACHED - Navigation successful!');
  
  return (
    <DataIntakeContainer>
      {(props) => {
        const {
          filteredVariables,
          handleDeleteClick,
          handleOpenDetailsModal,
          isDetailsModalOpen,
          selectedVariableForModal,
          closeDetailsModal,
          handleUpdateVariable,
          selectedOrgIdFromOrgStore
        } = props;

        // Show empty state when no variables
        if (filteredVariables.length === 0) {
          return (
            <EmptyState 
              message="No variables found for the selected organization. Upload a CSV file to get started." 
            />
          );
        }

        return (
          <>
            {/* Variable Cards Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8" data-testid="data-table">
              {filteredVariables.map((variable) => (
                <VariableCard
                  key={variable.id}
                  variable={variable}
                  onDelete={handleDeleteClick}
                  onViewDetails={handleOpenDetailsModal}
                />
              ))}
            </div>

            {/* Variable Details Modal */}
            <VariableDetailsModal
              isOpen={isDetailsModalOpen}
              onClose={closeDetailsModal}
              variableToEdit={selectedVariableForModal}
              onSave={handleUpdateVariable}
              currentOrganizationId={selectedOrgIdFromOrgStore}
            />
          </>
        );
      }}
    </DataIntakeContainer>
  );
} 