title 'ECR Repos'

control 'ECR Repos' do
  # A unique ID for this control
  impact 0.7 # The criticality, if this control fails.
  title 'Verify that required ECR exist'
  desc 'Verify that required ECR exist'

  describe aws_ecr_repository(repository_name: 'apps/flyway') do
    it { should exist }
    its('image_tag_mutability') { should_not eq 'IMMUTABLE' }
    its('image_scanning_configuration.scan_on_push') { should eq true }
  end

  describe aws_ecr_repository(repository_name: 'apps/demoapp') do
    it { should exist }
    its('image_tag_mutability') { should_not eq 'IMMUTABLE' }
    its('image_scanning_configuration.scan_on_push') { should eq true }
  end
end
