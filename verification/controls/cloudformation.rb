title 'Cloudformation Templates'

statuses = %w[CREATE_COMPLETE UPDATE_COMPLETE]

control 'cloudformation-1.0' do
  impact 0.9 # The criticality, if this control fails.
  title 'Cloudformation Templates'
  desc 'Validate that the expected Cloudformation Stacks have deployed properly'

  describe aws_cloudformation_stack('SpringBootDemoFoundationStack') do
    it { should exist }
    its ('stack_status') do
      should be_in statuses
    end
  end

  describe aws_cloudformation_stack('SpringBootDemoAppStack') do
    it { should exist }
    its ('stack_status') do
      should be_in statuses
    end
  end
end
